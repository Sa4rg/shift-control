package com.shiftcontrol.backend.closures.model;

import com.shiftcontrol.backend.shifts.model.Shift;
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
import jakarta.persistence.OneToOne;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "shift_closures")
public class ShiftClosure {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_id", nullable = false, unique = true)
    private Shift shift;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "closed_by", nullable = false)
    private User closedBy;

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

    @Column(name = "cash_to_withdraw", nullable = false, precision = 10, scale = 2)
    private BigDecimal cashToWithdraw;

    @Column(name = "expected_physical_cash", nullable = false, precision = 10, scale = 2)
    private BigDecimal expectedPhysicalCash;

    @Column(name = "confirmed_cash_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal confirmedCashAmount;

    @Column(name = "confirmed_mb_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal confirmedMbAmount;

    @Column(name = "cash_difference", nullable = false, precision = 10, scale = 2)
    private BigDecimal cashDifference;

    @Column(name = "mb_difference", nullable = false, precision = 10, scale = 2)
    private BigDecimal mbDifference;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private ClosureStatus status;

    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public ShiftClosure() {
    }

    public UUID getId() {
        return id;
    }

    public Shift getShift() {
        return shift;
    }

    public void setShift(Shift shift) {
        this.shift = shift;
    }

    public User getClosedBy() {
        return closedBy;
    }

    public void setClosedBy(User closedBy) {
        this.closedBy = closedBy;
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

    public BigDecimal getCashToWithdraw() {
        return cashToWithdraw;
    }

    public void setCashToWithdraw(BigDecimal cashToWithdraw) {
        this.cashToWithdraw = cashToWithdraw;
    }

    public BigDecimal getExpectedPhysicalCash() {
        return expectedPhysicalCash;
    }

    public void setExpectedPhysicalCash(BigDecimal expectedPhysicalCash) {
        this.expectedPhysicalCash = expectedPhysicalCash;
    }

    public BigDecimal getConfirmedCashAmount() {
        return confirmedCashAmount;
    }

    public void setConfirmedCashAmount(BigDecimal confirmedCashAmount) {
        this.confirmedCashAmount = confirmedCashAmount;
    }

    public BigDecimal getConfirmedMbAmount() {
        return confirmedMbAmount;
    }

    public void setConfirmedMbAmount(BigDecimal confirmedMbAmount) {
        this.confirmedMbAmount = confirmedMbAmount;
    }

    public BigDecimal getCashDifference() {
        return cashDifference;
    }

    public void setCashDifference(BigDecimal cashDifference) {
        this.cashDifference = cashDifference;
    }

    public BigDecimal getMbDifference() {
        return mbDifference;
    }

    public void setMbDifference(BigDecimal mbDifference) {
        this.mbDifference = mbDifference;
    }

    public ClosureStatus getStatus() {
        return status;
    }

    public void setStatus(ClosureStatus status) {
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