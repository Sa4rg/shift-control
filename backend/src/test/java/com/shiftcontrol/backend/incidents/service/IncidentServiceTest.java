package com.shiftcontrol.backend.incidents.service;

import com.shiftcontrol.backend.closures.model.ShiftClosure;
import com.shiftcontrol.backend.closures.repository.ShiftClosureRepository;
import com.shiftcontrol.backend.incidents.dto.CreateIncidentRequest;
import com.shiftcontrol.backend.incidents.dto.ResolveIncidentRequest;
import com.shiftcontrol.backend.incidents.model.Incident;
import com.shiftcontrol.backend.incidents.model.IncidentSeverity;
import com.shiftcontrol.backend.incidents.model.IncidentStatus;
import com.shiftcontrol.backend.incidents.model.IncidentType;
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
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IncidentServiceTest {

    @Mock
    private IncidentRepository incidentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ShiftRepository shiftRepository;

    @Mock
    private ShiftClosureRepository shiftClosureRepository;

    @Mock
    private SaleRepository saleRepository;

    @InjectMocks
    private IncidentService incidentService;

    // -------------------------------------------------------------------------
    // Helper methods
    // -------------------------------------------------------------------------

    private User activeAdmin() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setRole(Role.ADMIN);
        user.setActive(true);
        return user;
    }

    private User activeStaff() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setRole(Role.STAFF);
        user.setActive(true);
        return user;
    }

    private User activeStaffWithId(UUID id) {
        User user = new User();
        user.setId(id);
        user.setRole(Role.STAFF);
        user.setActive(true);
        return user;
    }

    private Shift shiftForStaff(User staff) {
        Shift shift = new Shift();
        shift.setStaff(staff);
        return shift;
    }

    private ShiftClosure closureForShift(Shift shift) {
        ShiftClosure closure = new ShiftClosure();
        closure.setShift(shift);
        return closure;
    }

    private Sale saleForShiftAndStaff(Shift shift, User staff) {
        Sale sale = new Sale();
        sale.setShift(shift);
        sale.setStaff(staff);
        return sale;
    }

    private CreateIncidentRequest createIncidentRequest(UUID shiftId, UUID closureId, UUID saleId) {
        return new CreateIncidentRequest(
                shiftId,
                closureId,
                saleId,
                IncidentType.CASH_DIFFERENCE,
                IncidentSeverity.MEDIUM,
                "Test title",
                "Test description"
        );
    }

    private ResolveIncidentRequest resolveIncidentRequest(String note) {
        return new ResolveIncidentRequest(note);
    }



    // -------------------------------------------------------------------------
    // createIncident tests
    // -------------------------------------------------------------------------

    @Test
    void should_create_incident_for_admin_with_shift_context() {
        // Arrange
        User admin = activeAdmin();
        UUID adminId = admin.getId();
        UUID shiftId = UUID.randomUUID();
        Shift shift = shiftForStaff(activeStaff());

        when(userRepository.findById(adminId)).thenReturn(Optional.of(admin));
        when(shiftRepository.findByIdWithDetails(shiftId)).thenReturn(Optional.of(shift));
        when(incidentRepository.save(any(Incident.class))).thenAnswer(inv -> inv.getArgument(0));

        CreateIncidentRequest request = createIncidentRequest(shiftId, null, null);

        // Act
        Incident result = incidentService.createIncident(adminId, request);

        // Assert
        assertThat(result.getStatus()).isEqualTo(IncidentStatus.OPEN);
        assertThat(result.getReportedBy()).isSameAs(admin);
        assertThat(result.getShift()).isSameAs(shift);
        assertThat(result.getType()).isEqualTo(IncidentType.CASH_DIFFERENCE);
        assertThat(result.getSeverity()).isEqualTo(IncidentSeverity.MEDIUM);
        assertThat(result.getTitle()).isEqualTo("Test title");
        assertThat(result.getDescription()).isEqualTo("Test description");
        assertThat(result.getCreatedAt()).isNotNull();
        assertThat(result.getUpdatedAt()).isNotNull();
    }

    @Test
    void should_create_incident_for_staff_on_own_shift() {
        // Arrange
        UUID staffId = UUID.randomUUID();
        User staff = activeStaffWithId(staffId);
        Shift shift = shiftForStaff(staff);
        UUID shiftId = UUID.randomUUID();

        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(shiftRepository.findByIdWithDetails(shiftId)).thenReturn(Optional.of(shift));
        when(incidentRepository.save(any(Incident.class))).thenAnswer(inv -> inv.getArgument(0));

        CreateIncidentRequest request = createIncidentRequest(shiftId, null, null);

        // Act
        Incident result = incidentService.createIncident(staffId, request);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getReportedBy()).isSameAs(staff);
    }

    @Test
    void should_throw_when_create_incident_has_no_context() {
        // Arrange
        User admin = activeAdmin();
        UUID adminId = admin.getId();

        when(userRepository.findById(adminId)).thenReturn(Optional.of(admin));

        CreateIncidentRequest request = createIncidentRequest(null, null, null);

        // Act + Assert
        assertThatThrownBy(() -> incidentService.createIncident(adminId, request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Incident must be related to a shift, closure, or sale");
    }

    @Test
    void should_throw_when_staff_reports_incident_for_other_staff_shift() {
        // Arrange
        UUID staffId = UUID.randomUUID();
        User staff = activeStaffWithId(staffId);
        User otherStaff = activeStaff();
        Shift shift = shiftForStaff(otherStaff);
        UUID shiftId = UUID.randomUUID();

        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(shiftRepository.findByIdWithDetails(shiftId)).thenReturn(Optional.of(shift));

        CreateIncidentRequest request = createIncidentRequest(shiftId, null, null);

        // Act + Assert
        assertThatThrownBy(() -> incidentService.createIncident(staffId, request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("You are not allowed to access this incident context");
    }

    @Test
    void should_throw_when_closure_does_not_belong_to_shift() {
        // Arrange
        User admin = activeAdmin();
        UUID adminId = admin.getId();

        UUID shiftIdValue = UUID.randomUUID();
        UUID otherShiftIdValue = UUID.randomUUID();

        Shift shift = new Shift();
        ReflectionTestUtils.setField(shift, "id", shiftIdValue);

        Shift otherShift = new Shift();
        ReflectionTestUtils.setField(otherShift, "id", otherShiftIdValue);

        ShiftClosure closure = closureForShift(otherShift);
        UUID closureId = UUID.randomUUID();

        when(userRepository.findById(adminId)).thenReturn(Optional.of(admin));
        when(shiftRepository.findByIdWithDetails(shiftIdValue)).thenReturn(Optional.of(shift));
        when(shiftClosureRepository.findWithDetailsById(closureId)).thenReturn(Optional.of(closure));

        CreateIncidentRequest request = createIncidentRequest(shiftIdValue, closureId, null);

        // Act + Assert
        assertThatThrownBy(() -> incidentService.createIncident(adminId, request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Closure does not belong to shift");
    }

    // -------------------------------------------------------------------------
    // listIncidents tests
    // -------------------------------------------------------------------------

    @Test
    void should_list_incidents_for_admin_without_status_filter() {
        // Arrange
        UUID adminId = UUID.randomUUID();
        List<Incident> incidents = List.of(new Incident(), new Incident());

        when(incidentRepository.findAdminFiltered(null, null, null, null, null, null)).thenReturn(incidents);

        // Act
        List<Incident> result = incidentService.listIncidents(null, adminId, Role.ADMIN, null, null, null, null, null);

        // Assert
        assertThat(result).isSameAs(incidents);
    }

    @Test
    void should_list_incidents_for_admin_with_status_filter() {
        // Arrange
        UUID adminId = UUID.randomUUID();
        List<Incident> incidents = List.of(new Incident());

        when(incidentRepository.findAdminFiltered(IncidentStatus.OPEN, null, null, null, null, null)).thenReturn(incidents);

        // Act
        List<Incident> result = incidentService.listIncidents(IncidentStatus.OPEN, adminId, Role.ADMIN, null, null, null, null, null);

        // Assert
        assertThat(result).isSameAs(incidents);
    }

    @Test
    void should_list_own_incidents_for_staff_without_status_filter() {
        // Arrange
        UUID staffId = UUID.randomUUID();
        List<Incident> incidents = List.of(new Incident(), new Incident());

        when(incidentRepository.findStaffFiltered(staffId, null, null, null, null)).thenReturn(incidents);

        // Act
        List<Incident> result = incidentService.listIncidents(null, staffId, Role.STAFF, null, null, null, null, null);

        // Assert
        assertThat(result).isSameAs(incidents);
    }

    @Test
    void should_list_own_incidents_for_staff_with_status_filter() {
        // Arrange
        UUID staffId = UUID.randomUUID();
        List<Incident> incidents = List.of(new Incident());

        when(incidentRepository.findStaffFiltered(staffId, IncidentStatus.OPEN, null, null, null))
                .thenReturn(incidents);

        // Act
        List<Incident> result = incidentService.listIncidents(IncidentStatus.OPEN, staffId, Role.STAFF, null, null, null, null, null);

        // Assert
        assertThat(result).isSameAs(incidents);
    }

    // -------------------------------------------------------------------------
    // getById tests
    // -------------------------------------------------------------------------

    @Test
    void should_return_incident_by_id_for_admin() {
        // Arrange
        UUID incidentId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();
        Incident incident = new Incident();

        when(incidentRepository.findWithDetailsById(incidentId)).thenReturn(Optional.of(incident));

        // Act
        Incident result = incidentService.getById(incidentId, adminId, Role.ADMIN);

        // Assert
        assertThat(result).isSameAs(incident);
    }

    @Test
    void should_return_incident_by_id_for_reporter_staff() {
        // Arrange
        UUID staffId = UUID.randomUUID();
        UUID incidentId = UUID.randomUUID();
        User staff = activeStaffWithId(staffId);

        Incident incident = new Incident();
        incident.setReportedBy(staff);

        when(incidentRepository.findWithDetailsById(incidentId)).thenReturn(Optional.of(incident));

        // Act
        Incident result = incidentService.getById(incidentId, staffId, Role.STAFF);

        // Assert
        assertThat(result).isSameAs(incident);
    }

    @Test
    void should_throw_when_staff_reads_unrelated_incident() {
        // Arrange
        UUID staffId = UUID.randomUUID();
        UUID incidentId = UUID.randomUUID();

        // Incident belongs to a different user; no shift, closure, or sale linked
        User otherUser = activeStaff();
        Incident incident = new Incident();
        incident.setReportedBy(otherUser);

        when(incidentRepository.findWithDetailsById(incidentId)).thenReturn(Optional.of(incident));

        // Act + Assert
        assertThatThrownBy(() -> incidentService.getById(incidentId, staffId, Role.STAFF))
                .isInstanceOf(BusinessException.class)
                .hasMessage("You are not allowed to access this incident");
    }

    // -------------------------------------------------------------------------
    // resolveIncident tests
    // -------------------------------------------------------------------------

    @Test
    void should_resolve_open_incident_by_admin() {
        // Arrange
        User admin = activeAdmin();
        UUID adminId = admin.getId();
        UUID incidentId = UUID.randomUUID();

        Incident incident = new Incident();
        incident.setStatus(IncidentStatus.OPEN);

        when(userRepository.findById(adminId)).thenReturn(Optional.of(admin));
        when(incidentRepository.findWithDetailsById(incidentId)).thenReturn(Optional.of(incident));
        when(incidentRepository.save(any(Incident.class))).thenAnswer(inv -> inv.getArgument(0));

        ResolveIncidentRequest request = resolveIncidentRequest("  resolution note  ");

        // Act
        Incident result = incidentService.resolveIncident(incidentId, adminId, request);

        // Assert
        assertThat(result.getStatus()).isEqualTo(IncidentStatus.RESOLVED);
        assertThat(result.getResolvedBy()).isSameAs(admin);
        assertThat(result.getResolutionNote()).isEqualTo("resolution note");
        assertThat(result.getResolvedAt()).isNotNull();
        assertThat(result.getUpdatedAt()).isNotNull();
        verify(incidentRepository).save(any(Incident.class));
    }

    @Test
    void should_throw_when_non_admin_resolves_incident() {
        // Arrange
        UUID staffId = UUID.randomUUID();
        UUID incidentId = UUID.randomUUID();
        User staff = activeStaffWithId(staffId);

        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));

        ResolveIncidentRequest request = resolveIncidentRequest("note");

        // Act + Assert
        assertThatThrownBy(() -> incidentService.resolveIncident(incidentId, staffId, request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Only admin users can resolve incidents");
    }

    @Test
    void should_throw_when_incident_is_already_resolved() {
        // Arrange
        User admin = activeAdmin();
        UUID adminId = admin.getId();
        UUID incidentId = UUID.randomUUID();

        Incident incident = new Incident();
        incident.setStatus(IncidentStatus.RESOLVED);

        when(userRepository.findById(adminId)).thenReturn(Optional.of(admin));
        when(incidentRepository.findWithDetailsById(incidentId)).thenReturn(Optional.of(incident));

        ResolveIncidentRequest request = resolveIncidentRequest("late note");

        // Act + Assert
        assertThatThrownBy(() -> incidentService.resolveIncident(incidentId, adminId, request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Incident is already resolved");
    }

    @Test
    void should_throw_not_found_when_incident_id_does_not_exist() {
        // Arrange
        UUID incidentId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();

        when(incidentRepository.findWithDetailsById(incidentId)).thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> incidentService.getById(incidentId, adminId, Role.ADMIN))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Incident not found");
    }
}
