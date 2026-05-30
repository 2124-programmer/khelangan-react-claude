package com.turfbook.backend.mapper;

import com.turfbook.backend.dto.NotificationDto;
import com.turfbook.backend.entity.NotificationEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface NotificationMapper {

    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "type", expression = "java(entity.getType().name())")
    @Mapping(target = "isRead", expression = "java(entity.isRead())")
    NotificationDto toDto(NotificationEntity entity);
}
