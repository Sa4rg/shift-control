package com.shiftcontrol.backend.reports.controller;

import com.shiftcontrol.backend.reports.dto.DailyReportResponse;
import com.shiftcontrol.backend.reports.service.DailyReportService;
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
public class DailyReportController {

    private final DailyReportService dailyReportService;

    public DailyReportController(DailyReportService dailyReportService) {
        this.dailyReportService = dailyReportService;
    }

    @GetMapping("/daily")
    public ApiResponse<DailyReportResponse> getDailyReport(
            @RequestParam UUID storeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        DailyReportResponse response = dailyReportService.getDailyReport(storeId, date);

        return ApiResponse.ok("Daily report retrieved successfully", response);
    }
}