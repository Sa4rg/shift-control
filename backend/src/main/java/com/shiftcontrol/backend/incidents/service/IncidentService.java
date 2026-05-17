package com.shiftcontrol.backend.incidents.service;

import com.shiftcontrol.backend.closures.model.ShiftClosure;
import com.shiftcontrol.backend.closures.repository.ShiftClosureRepository;
import com.shiftcontrol.backend.incidents.dto.CreateIncidentRequest;
import com.shiftcontrol.backend.incidents.dto.ResolveIncidentRequest;
import com.shiftcontrol.backend.incidents.model.Incident;
import com.shiftcontrol.backend.incidents.model.IncidentStatus;
import com.shiftcontrol.backend.incidents.repository.IncidentRepository;
import com.shiftcontrol.backend.sales.model.Sale;
import com.shiftcontrol.backend.sales.repository.SaleRepository;
import com.shiftcontrol.backend.shared.exception.BusinessException;
import com.shiftcontrol.backend.shared.exception.NotFoundException;
import com.shiftcontrol.backend.shifts.model.Shift;
import com.shiftcontrol.backend.shifts.repository.ShiftRepository;
import com.shiftcontrol.backend.users.model.Role;
import com.shiftcontrol.backend.users.model.User;
import com.shiftcontrol.backend.users.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class IncidentService {

    private final IncidentRepository incidentRepository;
    private final UserRepository userRepository;
    private final ShiftRepository shiftRepository;
    private final ShiftClosureRepository shiftClosureRepository;
    private final SaleRepository saleRepository;

    public IncidentService(
            IncidentRepository incidentRepository,
            UserRepository userRepository,
            ShiftRepository shiftRepository,
            ShiftClosureRepository shiftClosureRepository,
            SaleRepository saleRepository
    ) {
        this.incidentRepository = incidentRepository;
        this.userRepository = userRepository;
        this.shiftRepository = shiftRepository;
        this.shiftClosureRepository = shiftClosureRepository;
        this.saleRepository = saleRepository;
    }

    @Transactional
    public Incident createIncident(UUID reportedByUserId, CreateIncidentRequest request) {
        User reportedBy = userRepository.findById(reportedByUserId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        if (!reportedBy.isActive()) {
            throw new BusinessException("User is inactive");
        }

        if (request.shiftId() == null && request.closureId() == null && request.saleId() == null) {
            throw new BusinessException("Incident must be related to a shift, closure, or sale");
        }

        Shift shift = request.shiftId() == null
                ? null
                : shiftRepository.findByIdWithDetails(request.shiftId())
                        .orElseThrow(() -> new NotFoundException("Shift not found"));

        ShiftClosure closure = request.closureId() == null
                ? null
                : shiftClosureRepository.findWithDetailsById(request.closureId())
                        .orElseThrow(() -> new NotFoundException("Closure not found"));

        Sale sale = request.saleId() == null
                ? null
                : saleRepository.findWithDetailsById(request.saleId())
                        .orElseThrow(() -> new NotFoundException("Sale not found"));

        validateReferenceConsistency(shift, closure, sale);
        validateIncidentAccess(reportedBy, shift, closure, sale);

        Instant now = Instant.now();

        Incident incident = new Incident();
        incident.setShift(shift);
        incident.setClosure(closure);
        incident.setSale(sale);
        incident.setReportedBy(reportedBy);
        incident.setResolvedBy(null);
        incident.setType(request.type());
        incident.setStatus(IncidentStatus.OPEN);
        incident.setSeverity(request.severity());
        incident.setTitle(request.title().trim());
        incident.setDescription(request.description().trim());
        incident.setResolutionNote(null);
        incident.setCreatedAt(now);
        incident.setUpdatedAt(now);
        incident.setResolvedAt(null);

        return incidentRepository.save(incident);
    }

    @Transactional(readOnly = true)
    public List<Incident> listIncidents(IncidentStatus status, UUID authenticatedUserId, Role authenticatedRole) {
        if (authenticatedRole == Role.ADMIN) {
            if (status == null) {
                return incidentRepository.findAllByOrderByCreatedAtDesc();
            }
            return incidentRepository.findByStatusOrderByCreatedAtDesc(status);
        }

        if (authenticatedRole == Role.STAFF) {
            if (status == null) {
                return incidentRepository.findByStaffUserOrderByCreatedAtDesc(authenticatedUserId);
            }
            return incidentRepository.findByStaffUserAndStatusOrderByCreatedAtDesc(authenticatedUserId, status);
        }

        throw new BusinessException("Invalid user role");
    }

    @Transactional(readOnly = true)
    public Incident getById(UUID id, UUID authenticatedUserId, Role authenticatedRole) {
        Incident incident = incidentRepository.findWithDetailsById(id)
                .orElseThrow(() -> new NotFoundException("Incident not found"));

        validateIncidentReadAccess(incident, authenticatedUserId, authenticatedRole);

        return incident;
    }

    @Transactional
    public Incident resolveIncident(UUID id, UUID resolvedByUserId, ResolveIncidentRequest request) {
        User resolvedBy = userRepository.findById(resolvedByUserId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        if (!resolvedBy.isActive()) {
            throw new BusinessException("User is inactive");
        }

        if (resolvedBy.getRole() != Role.ADMIN) {
            throw new BusinessException("Only admin users can resolve incidents");
        }

        Incident incident = incidentRepository.findWithDetailsById(id)
                .orElseThrow(() -> new NotFoundException("Incident not found"));

        if (incident.getStatus() == IncidentStatus.RESOLVED) {
            throw new BusinessException("Incident is already resolved");
        }

        Instant now = Instant.now();

        incident.setStatus(IncidentStatus.RESOLVED);
        incident.setResolvedBy(resolvedBy);
        incident.setResolutionNote(request.resolutionNote().trim());
        incident.setResolvedAt(now);
        incident.setUpdatedAt(now);

        return incidentRepository.save(incident);
    }

    private void validateReferenceConsistency(Shift shift, ShiftClosure closure, Sale sale) {
        if (shift != null && closure != null && !closure.getShift().getId().equals(shift.getId())) {
            throw new BusinessException("Closure does not belong to shift");
        }

        if (shift != null && sale != null && !sale.getShift().getId().equals(shift.getId())) {
            throw new BusinessException("Sale does not belong to shift");
        }

        if (closure != null && sale != null && !sale.getShift().getId().equals(closure.getShift().getId())) {
            throw new BusinessException("Sale does not belong to closure shift");
        }
    }

    private void validateIncidentAccess(User user, Shift shift, ShiftClosure closure, Sale sale) {
        if (user.getRole() == Role.ADMIN) {
            return;
        }

        if (user.getRole() != Role.STAFF) {
            throw new BusinessException("Invalid user role");
        }

        if (shift != null && shift.getStaff().getId().equals(user.getId())) {
            return;
        }

        if (closure != null && closure.getShift().getStaff().getId().equals(user.getId())) {
            return;
        }

        if (sale != null && sale.getStaff().getId().equals(user.getId())) {
            return;
        }

        throw new BusinessException("You are not allowed to access this incident context");
    }

    private void validateIncidentReadAccess(Incident incident, UUID authenticatedUserId, Role authenticatedRole) {
        if (authenticatedRole == Role.ADMIN) {
            return;
        }

        if (authenticatedRole != Role.STAFF) {
            throw new BusinessException("Invalid user role");
        }

        if (incident.getReportedBy().getId().equals(authenticatedUserId)) {
            return;
        }

        if (incident.getShift() != null
                && incident.getShift().getStaff().getId().equals(authenticatedUserId)) {
            return;
        }

        if (incident.getClosure() != null
                && incident.getClosure().getShift().getStaff().getId().equals(authenticatedUserId)) {
            return;
        }

        if (incident.getSale() != null
                && incident.getSale().getStaff().getId().equals(authenticatedUserId)) {
            return;
        }

        throw new BusinessException("You are not allowed to access this incident");
    }
}