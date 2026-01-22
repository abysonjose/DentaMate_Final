package com.dentamate.appointments.model;

public enum AppointmentStatus {
    BOOKED("booked"),
    CONFIRMED("confirmed"),
    CHECKED_IN("checked_in"),
    IN_CONSULTATION("in_consultation"),
    COMPLETED("completed"),
    CANCELLED("cancelled"),
    NO_SHOW("no_show"),
    RESCHEDULED("rescheduled");

    private final String value;

    AppointmentStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static AppointmentStatus fromValue(String value) {
        for (AppointmentStatus status : AppointmentStatus.values()) {
            if (status.value.equals(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Invalid appointment status: " + value);
    }
}