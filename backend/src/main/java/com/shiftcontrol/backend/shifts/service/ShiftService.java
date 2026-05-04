package com.shiftcontrol.backend.shifts.service;

import com.shiftcontrol.backend.shared.exception.BusinessException;
import com.shiftcontrol.backend.shared.exception.NotFoundException;
import com.shiftcontrol.backend.shifts.dto.OpenShiftRequest;
import com.shiftcontrol.backend.shifts.model.Shift;
import com.shiftcontrol.backend.shifts.model.ShiftStatus;
import com.shiftcontrol.backend.shifts.repository.ShiftRepository;
import com.shiftcontrol.backend.users.model.Role;
import com.shiftcontrol.backend.users.model.User;
import com.shiftcontrol.backend.users.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.time.Instant;
import java.util.UUID;

@Service
public class ShiftService {

    private final ShiftRepository shiftRepository;
    private final UserRepository userRepository;

    public ShiftService(ShiftRepository shiftRepository, UserRepository userRepository) {
        this.shiftRepository = shiftRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public Shift openShift(UUID staffId, OpenShiftRequest request) {
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        if (staff.getRole() != Role.STAFF) {
            throw new BusinessException("Only staff users can open shifts");
        }

        if (!staff.isActive()) {
            throw new BusinessException("User is inactive");
        }

        if (staff.getStore() == null) {
            throw new BusinessException("Staff user has no store assigned");
        }

        if (!staff.getStore().isActive()) {
            throw new BusinessException("Store is inactive");
        }

        if (shiftRepository.existsByStaffAndStatus(staff, ShiftStatus.OPEN)) {
            throw new BusinessException("Staff already has an open shift");
        }

        Instant now = Instant.now();

        Shift shift = new Shift();
        shift.setStaff(staff);
        shift.setStore(staff.getStore());
        shift.setType(request.type());
        shift.setStatus(ShiftStatus.OPEN);
        shift.setOpenedAt(now);
        shift.setClosedAt(null);
        shift.setClosedBy(null);
        shift.setCreatedAt(now);
        shift.setUpdatedAt(now);

        return shiftRepository.save(shift);
    }

    @Transactional(readOnly = true)
    public Shift getCurrentShift(UUID staffId) {
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        if (staff.getRole() != Role.STAFF) {
            throw new BusinessException("Only staff users can have current shifts");
        }

        return shiftRepository.findByStaffAndStatus(staff, ShiftStatus.OPEN)
                .orElseThrow(() -> new NotFoundException("Open shift not found"));
    }

    @Transactional(readOnly = true)
    public Shift getById(UUID id) {
        return shiftRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new NotFoundException("Shift not found"));
    }

    @Transactional(readOnly = true)
    public List<Shift> listShifts(UUID authenticatedUserId, Role authenticatedRole) {
        if (authenticatedRole == Role.ADMIN) {
            return shiftRepository.findAllWithDetails();
        }

        if (authenticatedRole == Role.STAFF) {
            return shiftRepository.findByStaffIdWithDetails(authenticatedUserId);
        }

        throw new BusinessException("Invalid user role");
    }
}