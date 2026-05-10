package com.shiftcontrol.backend.reviews.controller;

import com.shiftcontrol.backend.reviews.dto.CreateWeeklyAdminReviewRequest;
import com.shiftcontrol.backend.reviews.dto.WeeklyAdminReviewResponse;
import com.shiftcontrol.backend.reviews.service.WeeklyAdminReviewService;
import com.shiftcontrol.backend.shared.response.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/weekly-reviews")
public class WeeklyAdminReviewController {

    private final WeeklyAdminReviewService weeklyAdminReviewService;

    public WeeklyAdminReviewController(WeeklyAdminReviewService weeklyAdminReviewService) {
        this.weeklyAdminReviewService = weeklyAdminReviewService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<WeeklyAdminReviewResponse> createReview(
            Authentication authentication,
            @Valid @RequestBody CreateWeeklyAdminReviewRequest request
    ) {
        UUID reviewedByUserId = UUID.fromString(authentication.getName());

        WeeklyAdminReviewResponse response = WeeklyAdminReviewResponse.fromEntity(
                weeklyAdminReviewService.createReview(reviewedByUserId, request)
        );

        return ApiResponse.ok("Weekly admin review created successfully", response);
    }

    @GetMapping
    public ApiResponse<List<WeeklyAdminReviewResponse>> listReviews() {
        List<WeeklyAdminReviewResponse> response = weeklyAdminReviewService.listReviews()
                .stream()
                .map(WeeklyAdminReviewResponse::fromEntity)
                .toList();

        return ApiResponse.ok("Weekly admin reviews retrieved successfully", response);
    }

    @GetMapping("/{id}")
    public ApiResponse<WeeklyAdminReviewResponse> getById(@PathVariable UUID id) {
        WeeklyAdminReviewResponse response = WeeklyAdminReviewResponse.fromEntity(
                weeklyAdminReviewService.getById(id)
        );

        return ApiResponse.ok("Weekly admin review retrieved successfully", response);
    }
}