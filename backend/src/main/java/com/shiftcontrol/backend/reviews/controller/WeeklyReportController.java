package com.shiftcontrol.backend.reviews.controller;

import com.shiftcontrol.backend.reviews.dto.WeeklyReportResponse;
import com.shiftcontrol.backend.reviews.service.WeeklyReportService;
import com.shiftcontrol.backend.shared.response.ApiResponse;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/reports")
public class WeeklyReportController {

    private final WeeklyReportService weeklyReportService;

    public WeeklyReportController(WeeklyReportService weeklyReportService) {
        this.weeklyReportService = weeklyReportService;
    }

    @GetMapping("/weekly")
    public ApiResponse<WeeklyReportResponse> getWeeklyReport(
            @RequestParam UUID storeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart
    ) {
        WeeklyReportResponse response = weeklyReportService.getWeeklyReport(storeId, weekStart);

        return ApiResponse.ok("Weekly report retrieved successfully", response);
    }
}