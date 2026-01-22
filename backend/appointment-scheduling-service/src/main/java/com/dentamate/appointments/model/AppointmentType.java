package com.dentamate.appointments.model;

public enum AppointmentType {
    CONSULTATION("consultation"),
    FOLLOW_UP("follow_up"),
    PROCEDURE("procedure"),
    EMERGENCY("emergency"),
    WALK_IN("walk_in"),
    ROUTINE_CHECKUP("routine_checkup"),
    ORTHODONTIC("orthodontic"),
    SURGERY("surgery");

    private final String value;

    AppointmentType(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static AppointmentType fromValue(String value) {
        for (AppointmentType type : AppointmentType.values()) {
            if (type.value.equals(value)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Invalid appointment type: " + value);
    }
}