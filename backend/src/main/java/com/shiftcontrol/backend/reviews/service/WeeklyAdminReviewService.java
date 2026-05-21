package com.shiftcontrol.backend.reviews.service;

import com.shiftcontrol.backend.reviews.dto.CreateWeeklyAdminReviewRequest;
import com.shiftcontrol.backend.reviews.dto.WeeklyReportResponse;
import com.shiftcontrol.backend.reviews.dto.WeeklyStaffSummaryResponse;
import com.shiftcontrol.backend.reviews.model.WeeklyAdminReview;
import com.shiftcontrol.backend.reviews.model.WeeklyAdminReviewStatus;
import com.shiftcontrol.backend.reviews.repository.WeeklyAdminReviewRepository;
import com.shiftcontrol.backend.shared.exception.BusinessException;
import com.shiftcontrol.backend.shared.exception.NotFoundException;
import com.shiftcontrol.backend.stores.model.Store;
import com.shiftcontrol.backend.stores.repository.StoreRepository;
import com.shiftcontrol.backend.users.model.Role;
import com.shiftcontrol.backend.users.model.User;
import com.shiftcontrol.backend.users.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import java.util.List;

@Service
public class WeeklyAdminReviewService {

    private final WeeklyAdminReviewRepository weeklyAdminReviewRepository;
    private final WeeklyReportService weeklyReportService;
    private final StoreRepository storeRepository;
    private final UserRepository userRepository;

    public WeeklyAdminReviewService(
            WeeklyAdminReviewRepository weeklyAdminReviewRepository,
            WeeklyReportService weeklyReportService,
            StoreRepository storeRepository,
            UserRepository userRepository
    ) {
        this.weeklyAdminReviewRepository = weeklyAdminReviewRepository;
        this.weeklyReportService = weeklyReportService;
        this.storeRepository = storeRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public WeeklyAdminReview createReview(UUID reviewedByUserId, CreateWeeklyAdminReviewRequest request) {
        User reviewedBy = userRepository.findById(reviewedByUserId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        if (reviewedBy.getRole() != Role.ADMIN) {
            throw new BusinessException("Only admin users can create weekly reviews");
        }

        if (!reviewedBy.isActive()) {
            throw new BusinessException("User is inactive");
        }

        Store store = storeRepository.findById(request.storeId())
                .orElseThrow(() -> new NotFoundException("Store not found"));

        User staff = userRepository.findById(request.staffId())
                .orElseThrow(() -> new NotFoundException("Staff user not found"));

        if (staff.getRole() != Role.STAFF) {
            throw new BusinessException("Weekly review staff must be a staff user");
        }

        if (staff.getStore() == null || !staff.getStore().getId().equals(store.getId())) {
            throw new BusinessException("Staff user does not belong to store");
        }

        if (weeklyAdminReviewRepository.existsByStoreAndStaffAndWeekStart(
                store,
                staff,
                request.weekStart()
        )) {
            throw new BusinessException("Weekly review already exists for staff and week");
        }

        WeeklyReportResponse weeklyReport = weeklyReportService.getWeeklyReport(
                store.getId(),
                request.weekStart()
        );

        WeeklyStaffSummaryResponse staffSummary = weeklyReport.staffSummaries()
                .stream()
                .filter(summary -> summary.staffId().equals(staff.getId()))
                .findFirst()
                .orElseThrow(() -> new BusinessException("No weekly closure summary found for staff"));

        LocalDate weekEnd = request.weekStart().plusDays(6);
        Instant now = Instant.now();

        WeeklyAdminReview review = new WeeklyAdminReview();
        review.setStore(store);
        review.setStaff(staff);
        review.setReviewedBy(reviewedBy);
        review.setWeekStart(request.weekStart());
        review.setWeekEnd(weekEnd);

        review.setTotalCash(staffSummary.totalCash());
        review.setTotalMb(staffSummary.totalMb());
        review.setTotalGlovoOnline(staffSummary.totalGlovoOnline());
        review.setTotalGlovoCash(staffSummary.totalGlovoCash());
        review.setTotalSales(staffSummary.totalSales());
        review.setPendingInvoiceTotal(staffSummary.pendingInvoiceTotal());

        review.setCashDifferenceTotal(staffSummary.cashDifferenceTotal());
        review.setMbDifferenceTotal(staffSummary.mbDifferenceTotal());

        review.setClosuresCount(staffSummary.closuresCount());
        review.setIncidentCount(staffSummary.incidentCount());

        review.setStatus(request.status());
        review.setNote(normalizeNullableText(request.note()));
        review.setCreatedAt(now);
        review.setUpdatedAt(now);

        return weeklyAdminReviewRepository.save(review);
    }

    private String normalizeNullableText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }

    @Transactional(readOnly = true)
    public List<WeeklyAdminReview> listReviews(
            UUID storeId,
            UUID staffId,
            LocalDate weekStart,
            WeeklyAdminReviewStatus status
    ) {
        return weeklyAdminReviewRepository.findWithFilters(
                storeId,
                staffId,
                weekStart != null ? weekStart.toString() : null,
                status != null ? status.name() : null
        );
    }

    @Transactional(readOnly = true)
    public WeeklyAdminReview getById(UUID id) {
        return weeklyAdminReviewRepository.findWithDetailsById(id)
                .orElseThrow(() -> new NotFoundException("Weekly admin review not found"));
    }
}