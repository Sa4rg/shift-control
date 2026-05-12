package com.shiftcontrol.backend.stores.service;

import com.shiftcontrol.backend.shared.exception.BusinessException;
import com.shiftcontrol.backend.shared.exception.NotFoundException;
import com.shiftcontrol.backend.stores.dto.CreateStoreRequest;
import com.shiftcontrol.backend.stores.dto.UpdateStoreRequest;
import com.shiftcontrol.backend.stores.repository.StoreRepository;
import com.shiftcontrol.backend.users.model.Role;
import com.shiftcontrol.backend.users.model.User;
import com.shiftcontrol.backend.users.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.shiftcontrol.backend.stores.model.Store;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.times;

@ExtendWith(MockitoExtension.class)
class StoreServiceTest {

    @Mock
    private StoreRepository storeRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private StoreService storeService;

    @Test
    void should_throw_business_exception_when_store_name_already_exists() {
        // Arrange
        when(storeRepository.existsByNameIgnoreCase("São Bento")).thenReturn(true);

        CreateStoreRequest request = new CreateStoreRequest(
                "São Bento",
                "Rua Example 123",
                new BigDecimal("103.00")
        );

        // Act + Assert
        assertThatThrownBy(() -> storeService.createStore(request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Store name already exists");

        verify(storeRepository, never()).save(any());
    }

    @Test
    void should_create_store_when_name_does_not_exist() {
        // Arrange
        CreateStoreRequest request = new CreateStoreRequest(
                "São Bento",
                "Rua Example 123",
                new BigDecimal("103.00")
        );

        Store savedStore = new Store();
        savedStore.setName("São Bento");
        savedStore.setAddress("Rua Example 123");
        savedStore.setBaseCashAmount(new BigDecimal("103.00"));

        when(storeRepository.existsByNameIgnoreCase("São Bento")).thenReturn(false);
        when(storeRepository.save(any(Store.class))).thenReturn(savedStore);

        // Act
        Store result = storeService.createStore(request);

        // Assert
        verify(storeRepository).save(any(Store.class));
        assertThat(result.getName()).isEqualTo("São Bento");
        assertThat(result.getAddress()).isEqualTo("Rua Example 123");
        assertThat(result.getBaseCashAmount()).isEqualByComparingTo("103.00");
    }

    @Test
    void should_return_active_stores_when_search_is_null_and_include_inactive_is_false() {
        // Arrange
        when(storeRepository.findByActiveTrue()).thenReturn(List.of());

        // Act
        storeService.searchStores(null, false);

        // Assert
        verify(storeRepository).findByActiveTrue();
        verify(storeRepository, never()).findAll();
        verify(storeRepository, never()).searchByNameOrAddress(any());
        verify(storeRepository, never()).searchActiveByNameOrAddress(any());
    }

    @Test
    void should_return_all_stores_when_search_is_null_and_include_inactive_is_true() {
        // Arrange
        when(storeRepository.findAll()).thenReturn(List.of());

        // Act
        storeService.searchStores(null, true);

        // Assert
        verify(storeRepository).findAll();
        verify(storeRepository, never()).findByActiveTrue();
        verify(storeRepository, never()).searchByNameOrAddress(any());
        verify(storeRepository, never()).searchActiveByNameOrAddress(any());
    }

    @Test
    void should_return_active_stores_when_search_is_blank_and_include_inactive_is_false() {
        // Arrange
        when(storeRepository.findByActiveTrue()).thenReturn(List.of());

        // Act
        storeService.searchStores("   ", false);

        // Assert
        verify(storeRepository).findByActiveTrue();
        verify(storeRepository, never()).findAll();
    }

    @Test
    void should_search_active_stores_when_search_is_provided_and_include_inactive_is_false() {
        // Arrange
        Store match = new Store();
        match.setName("São Bento");
        match.setAddress("Rua Example 123");
        match.setActive(true);

        when(storeRepository.searchActiveByNameOrAddress("sao")).thenReturn(List.of(match));

        // Act
        List<Store> result = storeService.searchStores("  sao  ", false);

        // Assert
        verify(storeRepository).searchActiveByNameOrAddress("sao");
        verify(storeRepository, never()).searchByNameOrAddress(any());
        verify(storeRepository, never()).findAll();
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("São Bento");
    }

    @Test
    void should_search_all_stores_when_search_is_provided_and_include_inactive_is_true() {
        // Arrange
        Store active = new Store();
        active.setName("São Bento");
        active.setActive(true);

        Store inactive = new Store();
        inactive.setName("Trindade");
        inactive.setActive(false);

        when(storeRepository.searchByNameOrAddress("ade")).thenReturn(List.of(active, inactive));

        // Act
        List<Store> result = storeService.searchStores("ade", true);

        // Assert
        verify(storeRepository).searchByNameOrAddress("ade");
        verify(storeRepository, never()).searchActiveByNameOrAddress(any());
        assertThat(result).hasSize(2);
    }

    @Test
    void should_update_store_when_name_is_not_used_by_another_store() {
        // Arrange
        UUID storeId = UUID.randomUUID();

        Store existing = new Store();
        existing.setName("Old Name");
        existing.setAddress("Old Address");
        existing.setBaseCashAmount(new BigDecimal("103.00"));

        UpdateStoreRequest request = new UpdateStoreRequest(
                "New Name",
                "New Address",
                new BigDecimal("150.00")
        );

        when(storeRepository.findById(storeId)).thenReturn(Optional.of(existing));
        when(storeRepository.findByNameIgnoreCase("New Name")).thenReturn(Optional.empty());
        when(storeRepository.save(any(Store.class))).thenReturn(existing);

        // Act
        Store result = storeService.updateStore(storeId, request);

        // Assert
        verify(storeRepository).save(existing);
        assertThat(result.getName()).isEqualTo("New Name");
        assertThat(result.getAddress()).isEqualTo("New Address");
        assertThat(result.getBaseCashAmount()).isEqualByComparingTo("150.00");
    }

    @Test
    void should_allow_update_when_name_belongs_to_same_store() {
        // Arrange
        UUID storeId = UUID.randomUUID();

        Store existing = new Store();
        existing.setId(storeId);
        existing.setName("São Bento");
        existing.setAddress("Rua Example 123");
        existing.setBaseCashAmount(new BigDecimal("103.00"));

        UpdateStoreRequest request = new UpdateStoreRequest(
                "São Bento",
                "Rua Nova 456",
                new BigDecimal("103.00")
        );

        when(storeRepository.findById(storeId)).thenReturn(Optional.of(existing));
        when(storeRepository.findByNameIgnoreCase("São Bento")).thenReturn(Optional.of(existing));
        when(storeRepository.save(any(Store.class))).thenReturn(existing);

        // Act + Assert (should not throw)
        Store result = storeService.updateStore(storeId, request);

        verify(storeRepository).save(existing);
        assertThat(result.getAddress()).isEqualTo("Rua Nova 456");
    }

    @Test
    void should_throw_not_found_when_updating_missing_store() {
        // Arrange
        UUID storeId = UUID.randomUUID();
        UpdateStoreRequest request = new UpdateStoreRequest(
                "Any Name",
                "Any Address",
                new BigDecimal("103.00")
        );

        when(storeRepository.findById(storeId)).thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> storeService.updateStore(storeId, request))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Store not found");

        verify(storeRepository, never()).save(any());
    }

    @Test
    void should_throw_business_exception_when_new_name_belongs_to_another_store() {
        // Arrange
        UUID storeId = UUID.randomUUID();
        UUID otherId = UUID.randomUUID();

        Store existing = new Store();
        existing.setId(storeId);
        existing.setName("Old Name");

        Store other = new Store();
        other.setId(otherId);
        other.setName("Taken Name");

        UpdateStoreRequest request = new UpdateStoreRequest(
                "Taken Name",
                "Any Address",
                new BigDecimal("103.00")
        );

        when(storeRepository.findById(storeId)).thenReturn(Optional.of(existing));
        when(storeRepository.findByNameIgnoreCase("Taken Name")).thenReturn(Optional.of(other));

        // Act + Assert
        assertThatThrownBy(() -> storeService.updateStore(storeId, request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Store name already exists");

        verify(storeRepository, never()).save(any());
    }

    @Test
    void should_deactivate_store_and_set_audit_fields() {
        // Arrange
        UUID storeId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();

        Store active = new Store();
        active.setId(storeId);
        active.setName("São Bento");
        active.setAddress("Rua Example 123");
        active.setBaseCashAmount(new BigDecimal("103.00"));
        active.setActive(true);

        User admin = new User();
        admin.setId(adminId);
        admin.setFullName("Admin User");
        admin.setUsername("admin");
        admin.setRole(Role.ADMIN);
        admin.setActive(true);

        when(storeRepository.findById(storeId)).thenReturn(Optional.of(active));
        when(userRepository.findById(adminId)).thenReturn(Optional.of(admin));
        when(storeRepository.save(any(Store.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        Store result = storeService.deactivateStore(storeId, adminId);

        // Assert
        verify(storeRepository).save(active);
        assertThat(result.isActive()).isFalse();
        assertThat(result.getDeactivatedBy()).isSameAs(admin);
        assertThat(result.getDeactivatedAt()).isNotNull();
        assertThat(result.getUpdatedAt()).isNotNull();
    }

    @Test
    void should_throw_when_deactivated_by_user_not_found() {
        // Arrange
        UUID storeId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();

        Store active = new Store();
        active.setId(storeId);
        active.setActive(true);

        when(storeRepository.findById(storeId)).thenReturn(Optional.of(active));
        when(userRepository.findById(adminId)).thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> storeService.deactivateStore(storeId, adminId))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("User not found");

        verify(storeRepository, never()).save(any());
    }

    @Test
    void should_throw_when_deactivating_already_inactive_store() {
        // Arrange
        UUID storeId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();

        Store inactive = new Store();
        inactive.setId(storeId);
        inactive.setActive(false);

        User admin = new User();
        admin.setId(adminId);
        admin.setRole(Role.ADMIN);
        admin.setActive(true);

        when(storeRepository.findById(storeId)).thenReturn(Optional.of(inactive));
        when(userRepository.findById(adminId)).thenReturn(Optional.of(admin));

        // Act + Assert
        assertThatThrownBy(() -> storeService.deactivateStore(storeId, adminId))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Store is already inactive");

        verify(storeRepository, never()).save(any());
    }

    @Test
    void should_throw_not_found_when_deactivating_missing_store() {
        // Arrange
        UUID storeId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();

        when(storeRepository.findById(storeId)).thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> storeService.deactivateStore(storeId, adminId))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Store not found");

        verify(storeRepository, never()).save(any());
    }
}
