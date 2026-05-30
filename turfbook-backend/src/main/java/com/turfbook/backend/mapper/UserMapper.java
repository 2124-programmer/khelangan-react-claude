package com.turfbook.backend.mapper;

import com.turfbook.backend.dto.UserDto;
import com.turfbook.backend.entity.UserEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface UserMapper {

    @Mapping(target = "role", expression = "java(entity.getRole().name())")
    @Mapping(target = "isPremium", expression = "java(entity.isPremium())")
    @Mapping(target = "isBlocked", expression = "java(entity.isBlocked())")
    UserDto toDto(UserEntity entity);
}
