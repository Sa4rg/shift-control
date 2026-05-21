package com.shiftcontrol.backend.shifts.repository;

import com.shiftcontrol.backend.shifts.model.Shift;
import com.shiftcontrol.backend.shifts.model.ShiftStatus;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public final class ShiftSpecification {

    private ShiftSpecification() {}

    public static Specification<Shift> withFilters(
            UUID storeId,
            UUID staffId,
            ShiftStatus status,
            Instant from,
            Instant to
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (storeId != null) {
                predicates.add(cb.equal(root.get("store").get("id"), storeId));
            }
            if (staffId != null) {
                predicates.add(cb.equal(root.get("staff").get("id"), staffId));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("openedAt"), from));
            }
            if (to != null) {
                predicates.add(cb.lessThan(root.get("openedAt"), to));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
