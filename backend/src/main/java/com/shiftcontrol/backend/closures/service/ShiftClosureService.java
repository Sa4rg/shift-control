package com.shiftcontrol.backend.closures.service;

import com.shiftcontrol.backend.closures.model.ShiftClosure;
import com.shiftcontrol.backend.closures.repository.ShiftClosureRepository;
import com.shiftcontrol.backend.shared.exception.BusinessException;
import com.shiftcontrol.backend.shared.exception.NotFoundException;
import com.shiftcontrol.backend.users.model.Role;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class ShiftClosureService {

    private final ShiftClosureRepository shiftClosureRepository;

    public ShiftClosureService(ShiftClosureRepository shiftClosureRepository) {
        this.shiftClosureRepository = shiftClosureRepository;
    }

    @Transactional(readOnly = true)
    public ShiftClosure getById(UUID id, UUID authenticatedUserId, Role authenticatedRole) {
        ShiftClosure closure = shiftClosureRepository.findWithDetailsById(id)
                .orElseThrow(() -> new NotFoundException("Closure not found"));

        validateAccess(closure, authenticatedUserId, authenticatedRole);

        return closure;
    }

    @Transactional(readOnly = true)
    public ShiftClosure getByShiftId(UUID shiftId, UUID authenticatedUserId, Role authenticatedRole) {
        ShiftClosure closure = shiftClosureRepository.findWithDetailsByShiftId(shiftId)
                .orElseThrow(() -> new NotFoundException("Closure not found"));

        validateAccess(closure, authenticatedUserId, authenticatedRole);

        return closure;
    }

    private void validateAccess(ShiftClosure closure, UUID authenticatedUserId, Role authenticatedRole) {
        if (authenticatedRole == Role.ADMIN) {
            return;
        }

        if (authenticatedRole == Role.STAFF
                && closure.getShift().getStaff().getId().equals(authenticatedUserId)) {
            return;
        }

        throw new BusinessException("You are not allowed to access this closure");
    }
}