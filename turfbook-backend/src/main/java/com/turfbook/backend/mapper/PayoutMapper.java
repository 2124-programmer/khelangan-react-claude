package com.turfbook.backend.mapper;

import com.turfbook.backend.dto.PayoutDto;
import com.turfbook.backend.entity.PayoutEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface PayoutMapper {

    @Mapping(target = "ownerId", source = "owner.id")
    @Mapping(target = "status", expression = "java(entity.getStatus().name())")
    PayoutDto toDto(PayoutEntity entity);
}
