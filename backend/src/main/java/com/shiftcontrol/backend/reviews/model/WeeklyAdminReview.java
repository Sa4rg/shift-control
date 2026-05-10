package com.shiftcontrol.backend.reviews.model;

import com.shiftcontrol.backend.stores.model.Store;
import com.shiftcontrol.backend.users.model.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "weekly_admin_reviews")
public class WeeklyAdminReview {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_id", nullable = false)
    private User staff;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by", nullable = false)
    private User reviewedBy;

    @Column(name = "week_start", nullable = false)
    private LocalDate weekStart;

    @Column(name = "week_end", nullable = false)
    private LocalDate weekEnd;

    @Column(name = "total_cash", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalCash;

    @Column(name = "total_mb", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalMb;

    @Column(name = "total_glovo_online", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalGlovoOnline;

    @Column(name = "total_glovo_cash", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalGlovoCash;

    @Column(name = "total_sales", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalSales;

    @Column(name = "pending_invoice_total", nullable = false, precision = 10, scale = 2)
    private BigDecimal pendingInvoiceTotal;

    @Column(name = "cash_difference_total", nullable = false, precision = 10, scale = 2)
    private BigDecimal cashDifferenceTotal;

    @Column(name = "mb_difference_total", nullable = false, precision = 10, scale = 2)
    private BigDecimal mbDifferenceTotal;

    @Column(name = "closures_count", nullable = false)
    private int closuresCount;

    @Column(name = "incident_count", nullable = false)
    private int incidentCount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private WeeklyAdminReviewStatus status;

    @Column(name = "note", length = 1000)
    private String note;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public WeeklyAdminReview() {
    }

    public UUID getId() {
        return id;
    }

    public Store getStore() {
        return store;
    }

    public void setStore(Store store) {
        this.store = store;
    }

    public User getStaff() {
        return staff;
    }

    public void setStaff(User staff) {
        this.staff = staff;
    }

    public User getReviewedBy() {
        return reviewedBy;
    }

    public void setReviewedBy(User reviewedBy) {
        this.reviewedBy = reviewedBy;
    }

    public LocalDate getWeekStart() {
        return weekStart;
    }

    public void setWeekStart(LocalDate weekStart) {
        this.weekStart = weekStart;
    }

    public LocalDate getWeekEnd() {
        return weekEnd;
    }

    public void setWeekEnd(LocalDate weekEnd) {
        this.weekEnd = weekEnd;
    }

    public BigDecimal getTotalCash() {
        return totalCash;
    }

    public void setTotalCash(BigDecimal totalCash) {
        this.totalCash = totalCash;
    }

    public BigDecimal getTotalMb() {
        return totalMb;
    }

    public void setTotalMb(BigDecimal totalMb) {
        this.totalMb = totalMb;
    }

    public BigDecimal getTotalGlovoOnline() {
        return totalGlovoOnline;
    }

    public void setTotalGlovoOnline(BigDecimal totalGlovoOnline) {
        this.totalGlovoOnline = totalGlovoOnline;
    }

    public BigDecimal getTotalGlovoCash() {
        return totalGlovoCash;
    }

    public void setTotalGlovoCash(BigDecimal totalGlovoCash) {
        this.totalGlovoCash = totalGlovoCash;
    }

    public BigDecimal getTotalSales() {
        return totalSales;
    }

    public void setTotalSales(BigDecimal totalSales) {
        this.totalSales = totalSales;
    }

    public BigDecimal getPendingInvoiceTotal() {
        return pendingInvoiceTotal;
    }

    public void setPendingInvoiceTotal(BigDecimal pendingInvoiceTotal) {
        this.pendingInvoiceTotal = pendingInvoiceTotal;
    }

    public BigDecimal getCashDifferenceTotal() {
        return cashDifferenceTotal;
    }

    public void setCashDifferenceTotal(BigDecimal cashDifferenceTotal) {
        this.cashDifferenceTotal = cashDifferenceTotal;
    }

    public BigDecimal getMbDifferenceTotal() {
        return mbDifferenceTotal;
    }

    public void setMbDifferenceTotal(BigDecimal mbDifferenceTotal) {
        this.mbDifferenceTotal = mbDifferenceTotal;
    }

    public int getClosuresCount() {
        return closuresCount;
    }

    public void setClosuresCount(int closuresCount) {
        this.closuresCount = closuresCount;
    }

    public int getIncidentCount() {
        return incidentCount;
    }

    public void setIncidentCount(int incidentCount) {
        this.incidentCount = incidentCount;
    }

    public WeeklyAdminReviewStatus getStatus() {
        return status;
    }

    public void setStatus(WeeklyAdminReviewStatus status) {
        this.status = status;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}