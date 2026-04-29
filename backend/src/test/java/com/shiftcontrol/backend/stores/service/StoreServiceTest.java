package com.shiftcontrol.backend.stores.service;

import com.shiftcontrol.backend.shared.exception.BusinessException;
import com.shiftcontrol.backend.stores.dto.CreateStoreRequest;
import com.shiftcontrol.backend.stores.repository.StoreRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import com.shiftcontrol.backend.stores.model.Store;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StoreServiceTest {

    @Mock
    private StoreRepository storeRepository;

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
}
