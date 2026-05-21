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
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WeeklyAdminReviewServiceTest {

    @Mock
    private WeeklyAdminReviewRepository weeklyAdminReviewRepository;

    @Mock
    private WeeklyReportService weeklyReportService;

    @Mock
    private StoreRepository storeRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private WeeklyAdminReviewService weeklyAdminReviewService;

    // -------------------------------------------------------------------------
    // Test 1: happy path — crear review desde el resumen semanal correctamente
    // -------------------------------------------------------------------------

    @Test
    void should_create_weekly_admin_review_from_weekly_report_summary() {
        // Arrange
        LocalDate weekStart = LocalDate.of(2026, 5, 4);
        UUID adminId = UUID.randomUUID();
        UUID storeId = UUID.randomUUID();
        UUID staffId = UUID.randomUUID();

        Store store = storeWithId(storeId, "Test Store");
        User admin = activeAdminWithId(adminId);
        User staff = activeStaffWithIdAndStore(staffId, store);

        CreateWeeklyAdminReviewRequest request = createRequest(
                storeId, staffId, weekStart,
                WeeklyAdminReviewStatus.REVIEWED_OK,
                "  Reviewed, all good  "
        );

        WeeklyStaffSummaryResponse staffSummary = weeklySummaryForStaff(store, staff);
        WeeklyReportResponse weeklyReport = new WeeklyReportResponse(
                storeId, weekStart, weekStart.plusDays(6), List.of(staffSummary)
        );

        when(userRepository.findById(adminId)).thenReturn(Optional.of(admin));
        when(storeRepository.findById(storeId)).thenReturn(Optional.of(store));
        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(weeklyAdminReviewRepository.existsByStoreAndStaffAndWeekStart(store, staff, weekStart))
                .thenReturn(false);
        when(weeklyReportService.getWeeklyReport(storeId, weekStart)).thenReturn(weeklyReport);
        when(weeklyAdminReviewRepository.save(any(WeeklyAdminReview.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        WeeklyAdminReview review = weeklyAdminReviewService.createReview(adminId, request);

        // Assert
        assertThat(review.getStore()).isSameAs(store);
        assertThat(review.getStaff()).isSameAs(staff);
        assertThat(review.getReviewedBy()).isSameAs(admin);
        assertThat(review.getWeekStart()).isEqualTo(LocalDate.of(2026, 5, 4));
        assertThat(review.getWeekEnd()).isEqualTo(LocalDate.of(2026, 5, 10));
        assertThat(review.getTotalCash()).isEqualByComparingTo("60.00");
        assertThat(review.getTotalMb()).isEqualByComparingTo("55.00");
        assertThat(review.getTotalGlovoOnline()).isEqualByComparingTo("15.00");
        assertThat(review.getTotalGlovoCash()).isEqualByComparingTo("15.00");
        assertThat(review.getTotalSales()).isEqualByComparingTo("145.00");
        assertThat(review.getPendingInvoiceTotal()).isEqualByComparingTo("25.00");
        assertThat(review.getCashDifferenceTotal()).isEqualByComparingTo("-3.00");
        assertThat(review.getMbDifferenceTotal()).isEqualByComparingTo("2.00");
        assertThat(review.getClosuresCount()).isEqualTo(2);
        assertThat(review.getIncidentCount()).isEqualTo(1);
        assertThat(review.getStatus()).isEqualTo(WeeklyAdminReviewStatus.REVIEWED_OK);
        assertThat(review.getNote()).isEqualTo("Reviewed, all good");
        assertThat(review.getCreatedAt()).isNotNull();
        assertThat(review.getUpdatedAt()).isNotNull();

        verify(weeklyAdminReviewRepository).save(any(WeeklyAdminReview.class));
    }

    // -------------------------------------------------------------------------
    // Test 2: reviewer no existe
    // -------------------------------------------------------------------------

    @Test
    void should_throw_when_reviewed_by_user_not_found() {
        // Arrange
        UUID unknownUserId = UUID.randomUUID();
        CreateWeeklyAdminReviewRequest request = createRequest(
                UUID.randomUUID(), UUID.randomUUID(),
                LocalDate.of(2026, 5, 4),
                WeeklyAdminReviewStatus.REVIEWED_OK, null
        );

        when(userRepository.findById(unknownUserId)).thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> weeklyAdminReviewService.createReview(unknownUserId, request))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("User not found");

        verify(weeklyAdminReviewRepository, never()).save(any());
    }

    // -------------------------------------------------------------------------
    // Test 3: reviewer existe pero tiene rol STAFF, no ADMIN
    // -------------------------------------------------------------------------

    @Test
    void should_throw_when_reviewed_by_is_not_admin() {
        // Arrange
        UUID staffAsReviewerId = UUID.randomUUID();
        UUID storeId = UUID.randomUUID();
        Store store = storeWithId(storeId, "Test Store");
        User staffAsReviewer = activeStaffWithIdAndStore(staffAsReviewerId, store);

        CreateWeeklyAdminReviewRequest request = createRequest(
                storeId, UUID.randomUUID(),
                LocalDate.of(2026, 5, 4),
                WeeklyAdminReviewStatus.REVIEWED_OK, null
        );

        when(userRepository.findById(staffAsReviewerId)).thenReturn(Optional.of(staffAsReviewer));

        // Act + Assert
        assertThatThrownBy(() -> weeklyAdminReviewService.createReview(staffAsReviewerId, request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Only admin users can create weekly reviews");

        verify(weeklyAdminReviewRepository, never()).save(any());
    }

    // -------------------------------------------------------------------------
    // Test 4: admin inactivo
    // -------------------------------------------------------------------------

    @Test
    void should_throw_when_admin_is_inactive() {
        // Arrange
        UUID adminId = UUID.randomUUID();
        User inactiveAdmin = inactiveAdminWithId(adminId);

        CreateWeeklyAdminReviewRequest request = createRequest(
                UUID.randomUUID(), UUID.randomUUID(),
                LocalDate.of(2026, 5, 4),
                WeeklyAdminReviewStatus.REVIEWED_OK, null
        );

        when(userRepository.findById(adminId)).thenReturn(Optional.of(inactiveAdmin));

        // Act + Assert
        assertThatThrownBy(() -> weeklyAdminReviewService.createReview(adminId, request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("User is inactive");

        verify(weeklyAdminReviewRepository, never()).save(any());
    }

    // -------------------------------------------------------------------------
    // Test 5: store no existe
    // -------------------------------------------------------------------------

    @Test
    void should_throw_when_store_not_found() {
        // Arrange
        UUID adminId = UUID.randomUUID();
        UUID unknownStoreId = UUID.randomUUID();
        User admin = activeAdminWithId(adminId);

        CreateWeeklyAdminReviewRequest request = createRequest(
                unknownStoreId, UUID.randomUUID(),
                LocalDate.of(2026, 5, 4),
                WeeklyAdminReviewStatus.REVIEWED_OK, null
        );

        when(userRepository.findById(adminId)).thenReturn(Optional.of(admin));
        when(storeRepository.findById(unknownStoreId)).thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> weeklyAdminReviewService.createReview(adminId, request))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Store not found");

        verify(weeklyAdminReviewRepository, never()).save(any());
    }

    // -------------------------------------------------------------------------
    // Test 6: staff no existe
    // -------------------------------------------------------------------------

    @Test
    void should_throw_when_staff_not_found() {
        // Arrange
        UUID adminId = UUID.randomUUID();
        UUID storeId = UUID.randomUUID();
        UUID unknownStaffId = UUID.randomUUID();
        User admin = activeAdminWithId(adminId);
        Store store = storeWithId(storeId, "Test Store");

        CreateWeeklyAdminReviewRequest request = createRequest(
                storeId, unknownStaffId,
                LocalDate.of(2026, 5, 4),
                WeeklyAdminReviewStatus.REVIEWED_OK, null
        );

        when(userRepository.findById(adminId)).thenReturn(Optional.of(admin));
        when(storeRepository.findById(storeId)).thenReturn(Optional.of(store));
        when(userRepository.findById(unknownStaffId)).thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> weeklyAdminReviewService.createReview(adminId, request))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Staff user not found");

        verify(weeklyAdminReviewRepository, never()).save(any());
    }

    // -------------------------------------------------------------------------
    // Test 7: el staffId apunta a un ADMIN, no a un STAFF
    // -------------------------------------------------------------------------

    @Test
    void should_throw_when_selected_user_is_not_staff() {
        // Arrange
        UUID adminId = UUID.randomUUID();
        UUID storeId = UUID.randomUUID();
        UUID anotherAdminId = UUID.randomUUID();
        User admin = activeAdminWithId(adminId);
        Store store = storeWithId(storeId, "Test Store");
        User anotherAdmin = activeAdminWithId(anotherAdminId);

        CreateWeeklyAdminReviewRequest request = createRequest(
                storeId, anotherAdminId,
                LocalDate.of(2026, 5, 4),
                WeeklyAdminReviewStatus.REVIEWED_OK, null
        );

        when(userRepository.findById(adminId)).thenReturn(Optional.of(admin));
        when(storeRepository.findById(storeId)).thenReturn(Optional.of(store));
        when(userRepository.findById(anotherAdminId)).thenReturn(Optional.of(anotherAdmin));

        // Act + Assert
        assertThatThrownBy(() -> weeklyAdminReviewService.createReview(adminId, request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Weekly review staff must be a staff user");

        verify(weeklyAdminReviewRepository, never()).save(any());
    }

    // -------------------------------------------------------------------------
    // Test 8: el staff pertenece a otra tienda
    // -------------------------------------------------------------------------

    @Test
    void should_throw_when_staff_does_not_belong_to_store() {
        // Arrange
        UUID adminId = UUID.randomUUID();
        UUID storeId = UUID.randomUUID();
        UUID otherStoreId = UUID.randomUUID();
        UUID staffId = UUID.randomUUID();
        User admin = activeAdminWithId(adminId);
        Store store = storeWithId(storeId, "Main Store");
        Store otherStore = storeWithId(otherStoreId, "Other Store");
        User staffFromOtherStore = activeStaffWithIdAndStore(staffId, otherStore);

        CreateWeeklyAdminReviewRequest request = createRequest(
                storeId, staffId,
                LocalDate.of(2026, 5, 4),
                WeeklyAdminReviewStatus.REVIEWED_OK, null
        );

        when(userRepository.findById(adminId)).thenReturn(Optional.of(admin));
        when(storeRepository.findById(storeId)).thenReturn(Optional.of(store));
        when(userRepository.findById(staffId)).thenReturn(Optional.of(staffFromOtherStore));

        // Act + Assert
        assertThatThrownBy(() -> weeklyAdminReviewService.createReview(adminId, request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Staff user does not belong to store");

        verify(weeklyAdminReviewRepository, never()).save(any());
    }

    // -------------------------------------------------------------------------
    // Test 9: ya existe un review para esa semana y ese staff
    // -------------------------------------------------------------------------

    @Test
    void should_throw_when_weekly_review_already_exists() {
        // Arrange
        UUID adminId = UUID.randomUUID();
        UUID storeId = UUID.randomUUID();
        UUID staffId = UUID.randomUUID();
        LocalDate weekStart = LocalDate.of(2026, 5, 4);
        User admin = activeAdminWithId(adminId);
        Store store = storeWithId(storeId, "Test Store");
        User staff = activeStaffWithIdAndStore(staffId, store);

        CreateWeeklyAdminReviewRequest request = createRequest(
                storeId, staffId, weekStart,
                WeeklyAdminReviewStatus.REVIEWED_OK, null
        );

        when(userRepository.findById(adminId)).thenReturn(Optional.of(admin));
        when(storeRepository.findById(storeId)).thenReturn(Optional.of(store));
        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(weeklyAdminReviewRepository.existsByStoreAndStaffAndWeekStart(store, staff, weekStart))
                .thenReturn(true);

        // Act + Assert
        assertThatThrownBy(() -> weeklyAdminReviewService.createReview(adminId, request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Weekly review already exists for staff and week");

        verify(weeklyAdminReviewRepository, never()).save(any());
    }

    // -------------------------------------------------------------------------
    // Test 10: el reporte semanal no tiene cierre para ese staff
    // -------------------------------------------------------------------------

    @Test
    void should_throw_when_no_weekly_closure_summary_found_for_staff() {
        // Arrange
        UUID adminId = UUID.randomUUID();
        UUID storeId = UUID.randomUUID();
        UUID staffId = UUID.randomUUID();
        UUID otherStaffId = UUID.randomUUID();
        LocalDate weekStart = LocalDate.of(2026, 5, 4);
        User admin = activeAdminWithId(adminId);
        Store store = storeWithId(storeId, "Test Store");
        User staff = activeStaffWithIdAndStore(staffId, store);
        User otherStaff = activeStaffWithIdAndStore(otherStaffId, store);

        CreateWeeklyAdminReviewRequest request = createRequest(
                storeId, staffId, weekStart,
                WeeklyAdminReviewStatus.REVIEWED_OK, null
        );

        // El reporte sólo contiene resumen de un staff diferente al solicitado
        WeeklyStaffSummaryResponse otherSummary = weeklySummaryForStaff(store, otherStaff);
        WeeklyReportResponse reportWithoutTargetStaff = new WeeklyReportResponse(
                storeId, weekStart, weekStart.plusDays(6), List.of(otherSummary)
        );

        when(userRepository.findById(adminId)).thenReturn(Optional.of(admin));
        when(storeRepository.findById(storeId)).thenReturn(Optional.of(store));
        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(weeklyAdminReviewRepository.existsByStoreAndStaffAndWeekStart(store, staff, weekStart))
                .thenReturn(false);
        when(weeklyReportService.getWeeklyReport(storeId, weekStart)).thenReturn(reportWithoutTargetStaff);

        // Act + Assert
        assertThatThrownBy(() -> weeklyAdminReviewService.createReview(adminId, request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("No weekly closure summary found for staff");

        verify(weeklyAdminReviewRepository, never()).save(any());
    }

    // -------------------------------------------------------------------------
    // Test 11: listar todas las reviews
    // -------------------------------------------------------------------------

    @Test
    void should_list_weekly_admin_reviews() {
        // Arrange
        WeeklyAdminReview review1 = new WeeklyAdminReview();
        WeeklyAdminReview review2 = new WeeklyAdminReview();
        List<WeeklyAdminReview> expected = List.of(review1, review2);

        when(weeklyAdminReviewRepository.findWithFilters(null, null, null, null))
                .thenReturn(expected);

        // Act
        List<WeeklyAdminReview> result = weeklyAdminReviewService.listReviews(null, null, null, null);

        // Assert
        assertThat(result).isSameAs(expected);
        verify(weeklyAdminReviewRepository).findWithFilters(null, null, null, null);
    }

    // -------------------------------------------------------------------------
    // Test 12: obtener review por id existente
    // -------------------------------------------------------------------------

    @Test
    void should_return_weekly_admin_review_by_id() {
        // Arrange
        UUID id = UUID.randomUUID();
        WeeklyAdminReview review = new WeeklyAdminReview();

        when(weeklyAdminReviewRepository.findWithDetailsById(id))
                .thenReturn(Optional.of(review));

        // Act
        WeeklyAdminReview result = weeklyAdminReviewService.getById(id);

        // Assert
        assertThat(result).isSameAs(review);
    }

    // -------------------------------------------------------------------------
    // Test 13: obtener review por id inexistente lanza NotFoundException
    // -------------------------------------------------------------------------

    @Test
    void should_throw_not_found_when_weekly_admin_review_id_does_not_exist() {
        // Arrange
        UUID id = UUID.randomUUID();

        when(weeklyAdminReviewRepository.findWithDetailsById(id))
                .thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> weeklyAdminReviewService.getById(id))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Weekly admin review not found");
    }

    // -------------------------------------------------------------------------
    // Helper methods
    // -------------------------------------------------------------------------

    private Store storeWithId(UUID id, String name) {
        Store store = new Store();
        store.setId(id);
        store.setName(name);
        store.setAddress("Test Address");
        store.setBaseCashAmount(new BigDecimal("103.00"));
        store.setActive(true);
        store.setCreatedAt(Instant.now());
        store.setUpdatedAt(Instant.now());
        return store;
    }

    private User activeAdminWithId(UUID id) {
        User admin = new User();
        admin.setId(id);
        admin.setFullName("Test Admin");
        admin.setUsername("admin." + id);
        admin.setRole(Role.ADMIN);
        admin.setPasswordHash("hashed-password");
        admin.setActive(true);
        admin.setCreatedAt(Instant.now());
        admin.setUpdatedAt(Instant.now());
        return admin;
    }

    private User inactiveAdminWithId(UUID id) {
        User admin = activeAdminWithId(id);
        admin.setActive(false);
        return admin;
    }

    private User activeStaffWithIdAndStore(UUID id, Store store) {
        User staff = new User();
        staff.setId(id);
        staff.setFullName("Test Staff");
        staff.setUsername("staff." + id);
        staff.setRole(Role.STAFF);
        staff.setStore(store);
        staff.setPinHash("hashed-pin");
        staff.setActive(true);
        staff.setCreatedAt(Instant.now());
        staff.setUpdatedAt(Instant.now());
        return staff;
    }

    private WeeklyStaffSummaryResponse weeklySummaryForStaff(Store store, User staff) {
        return new WeeklyStaffSummaryResponse(
                store.getId(),
                store.getName(),
                staff.getId(),
                staff.getFullName(),
                new BigDecimal("60.00"),
                new BigDecimal("55.00"),
                new BigDecimal("15.00"),
                new BigDecimal("15.00"),
                new BigDecimal("145.00"),
                new BigDecimal("25.00"),
                new BigDecimal("-3.00"),
                new BigDecimal("2.00"),
                2,
                1
        );
    }

    private CreateWeeklyAdminReviewRequest createRequest(
            UUID storeId,
            UUID staffId,
            LocalDate weekStart,
            WeeklyAdminReviewStatus status,
            String note
    ) {
        return new CreateWeeklyAdminReviewRequest(storeId, staffId, weekStart, status, note);
    }
}
