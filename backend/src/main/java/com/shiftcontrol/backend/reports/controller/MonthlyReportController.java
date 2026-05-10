package com.shiftcontrol.backend.reports.controller;

import com.shiftcontrol.backend.reports.dto.MonthlyReportResponse;
import com.shiftcontrol.backend.reports.service.MonthlyReportService;
import com.shiftcontrol.backend.shared.response.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/reports")
public class MonthlyReportController {

    private final MonthlyReportService monthlyReportService;

    public MonthlyReportController(MonthlyReportService monthlyReportService) {
        this.monthlyReportService = monthlyReportService;
    }

    @GetMapping("/monthly")
    public ApiResponse<MonthlyReportResponse> getMonthlyReport(
            @RequestParam UUID storeId,
            @RequestParam String month
    ) {
        MonthlyReportResponse response = monthlyReportService.getMonthlyReport(storeId, month);

        return ApiResponse.ok("Monthly report retrieved successfully", response);
    }
}