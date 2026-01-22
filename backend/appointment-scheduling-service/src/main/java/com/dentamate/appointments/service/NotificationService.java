package com.dentamate.appointments.service;

import com.dentamate.appointments.model.Appointment;
import com.dentamate.appointments.model.AppointmentStatus;

import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
public class NotificationService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("MMM dd, yyyy 'at' hh:mm a");

    // TODO: Integrate with actual notification service (SMS, Email, WhatsApp)
    // For now, this service logs notifications that would be sent

    /**
     * Send appointment confirmation notification
     */
    public void sendAppointmentConfirmation(Appointment appointment) {
        try {
            String message = buildConfirmationMessage(appointment);
            
            // Log the notification (in real implementation, this would send actual notifications)
            logger.info("Sending appointment confirmation to patient {}: {}", 
                       appointment.getPatientId(), message);
            
            // TODO: Integrate with notification-communication-service
            // notificationClient.sendSMS(patientPhone, message);
            // notificationClient.sendEmail(patientEmail, "Appointment Confirmed", message);
            
        } catch (Exception e) {
            logger.error("Failed to send appointment confirmation for appointment {}: {}", 
                        appointment.getId(), e.getMessage());
        }
    }

    /**
     * Send appointment status update notification
     */
    public void sendStatusUpdateNotification(Appointment appointment, AppointmentStatus oldStatus, 
                                           AppointmentStatus newStatus) {
        try {
            String message = buildStatusUpdateMessage(appointment, oldStatus, newStatus);
            
            logger.info("Sending status update notification to patient {}: {}", 
                       appointment.getPatientId(), message);
            
            // TODO: Send actual notifications based on status
            // Different statuses might require different notification channels
            
        } catch (Exception e) {
            logger.error("Failed to send status update notification for appointment {}: {}", 
                        appointment.getId(), e.getMessage());
        }
    }

    /**
     * Send appointment reschedule notification
     */
    public void sendRescheduleNotification(Appointment appointment, LocalDateTime oldDateTime, 
                                         LocalDateTime newDateTime, String reason) {
        try {
            String message = buildRescheduleMessage(appointment, oldDateTime, newDateTime, reason);
            
            logger.info("Sending reschedule notification to patient {}: {}", 
                       appointment.getPatientId(), message);
            
            // TODO: Send actual notifications
            
        } catch (Exception e) {
            logger.error("Failed to send reschedule notification for appointment {}: {}", 
                        appointment.getId(), e.getMessage());
        }
    }

    /**
     * Send appointment cancellation notification
     */
    public void sendCancellationNotification(Appointment appointment, String reason) {
        try {
            String message = buildCancellationMessage(appointment, reason);
            
            logger.info("Sending cancellation notification to patient {}: {}", 
                       appointment.getPatientId(), message);
            
            // TODO: Send actual notifications
            
        } catch (Exception e) {
            logger.error("Failed to send cancellation notification for appointment {}: {}", 
                        appointment.getId(), e.getMessage());
        }
    }

    /**
     * Send appointment reminder notification
     */
    public void sendAppointmentReminder(Appointment appointment, int minutesBefore) {
        try {
            String message = buildReminderMessage(appointment, minutesBefore);
            
            logger.info("Sending appointment reminder to patient {} ({} minutes before): {}", 
                       appointment.getPatientId(), minutesBefore, message);
            
            // TODO: Send actual notifications based on reminder preferences
            
        } catch (Exception e) {
            logger.error("Failed to send appointment reminder for appointment {}: {}", 
                        appointment.getId(), e.getMessage());
        }
    }

    /**
     * Send token update notification
     */
    public void sendTokenUpdateNotification(String tenantId, String patientId, Integer tokenNumber, 
                                          String status, Integer estimatedWaitTime) {
        try {
            String message = buildTokenUpdateMessage(tokenNumber, status, estimatedWaitTime);
            
            logger.info("Sending token update notification to patient {}: {}", patientId, message);
            
            // TODO: Send actual notifications (especially useful for mobile app push notifications)
            
        } catch (Exception e) {
            logger.error("Failed to send token update notification for patient {}: {}", patientId, e.getMessage());
        }
    }

    /**
     * Send doctor notification for new appointment
     */
    public void sendDoctorNotification(Appointment appointment, String notificationType) {
        try {
            String message = buildDoctorNotificationMessage(appointment, notificationType);
            
            logger.info("Sending {} notification to doctor {}: {}", 
                       notificationType, appointment.getDoctorId(), message);
            
            // TODO: Send actual notifications to doctor
            
        } catch (Exception e) {
            logger.error("Failed to send doctor notification for appointment {}: {}", 
                        appointment.getId(), e.getMessage());
        }
    }

    /**
     * Send bulk reminder notifications
     */
    public void sendBulkReminders(java.util.List<Appointment> appointments, int minutesBefore) {
        logger.info("Sending bulk reminders for {} appointments ({} minutes before)", 
                   appointments.size(), minutesBefore);
        
        for (Appointment appointment : appointments) {
            sendAppointmentReminder(appointment, minutesBefore);
        }
    }

    // Private helper methods for building messages

    private String buildConfirmationMessage(Appointment appointment) {
        return String.format(
            "Your appointment has been confirmed for %s. " +
            "Appointment Type: %s. " +
            "Please arrive 15 minutes early. " +
            "For any changes, please contact us at least 2 hours in advance.",
            appointment.getAppointmentDateTime().format(DATE_TIME_FORMATTER),
            appointment.getAppointmentType()
        );
    }

    private String buildStatusUpdateMessage(Appointment appointment, AppointmentStatus oldStatus, 
                                          AppointmentStatus newStatus) {
        return switch (newStatus) {
            case CONFIRMED -> "Your appointment has been confirmed for " + 
                            appointment.getAppointmentDateTime().format(DATE_TIME_FORMATTER);
            case CHECKED_IN -> "You have been checked in. Please wait for your turn.";
            case IN_CONSULTATION -> "Your consultation has started.";
            case COMPLETED -> "Your appointment has been completed. Thank you for visiting us.";
            default -> String.format("Your appointment status has been updated to: %s", newStatus.getValue());
        };
    }

    private String buildRescheduleMessage(Appointment appointment, LocalDateTime oldDateTime, 
                                        LocalDateTime newDateTime, String reason) {
        return String.format(
            "Your appointment has been rescheduled from %s to %s. " +
            "Reason: %s. " +
            "Please make note of the new time.",
            oldDateTime.format(DATE_TIME_FORMATTER),
            newDateTime.format(DATE_TIME_FORMATTER),
            reason != null ? reason : "Schedule change"
        );
    }

    private String buildCancellationMessage(Appointment appointment, String reason) {
        return String.format(
            "Your appointment scheduled for %s has been cancelled. " +
            "Reason: %s. " +
            "Please contact us to reschedule if needed.",
            appointment.getAppointmentDateTime().format(DATE_TIME_FORMATTER),
            reason != null ? reason : "Cancellation requested"
        );
    }

    private String buildReminderMessage(Appointment appointment, int minutesBefore) {
        String timeText = minutesBefore >= 60 ? 
            (minutesBefore / 60) + " hour(s)" : 
            minutesBefore + " minute(s)";
            
        return String.format(
            "Reminder: You have an appointment in %s at %s. " +
            "Appointment Type: %s. " +
            "Please arrive 15 minutes early.",
            timeText,
            appointment.getAppointmentDateTime().format(DATE_TIME_FORMATTER),
            appointment.getAppointmentType()
        );
    }

    private String buildTokenUpdateMessage(Integer tokenNumber, String status, Integer estimatedWaitTime) {
        String baseMessage = String.format("Your token number is %d. Status: %s.", tokenNumber, status);
        
        if (estimatedWaitTime != null && estimatedWaitTime > 0) {
            baseMessage += String.format(" Estimated wait time: %d minutes.", estimatedWaitTime);
        }
        
        return baseMessage;
    }

    private String buildDoctorNotificationMessage(Appointment appointment, String notificationType) {
        return switch (notificationType) {
            case "new_appointment" -> String.format(
                "New appointment scheduled: Patient %s on %s for %s",
                appointment.getPatientId(),
                appointment.getAppointmentDateTime().format(DATE_TIME_FORMATTER),
                appointment.getAppointmentType()
            );
            case "appointment_cancelled" -> String.format(
                "Appointment cancelled: Patient %s scheduled for %s",
                appointment.getPatientId(),
                appointment.getAppointmentDateTime().format(DATE_TIME_FORMATTER)
            );
            case "appointment_rescheduled" -> String.format(
                "Appointment rescheduled: Patient %s now scheduled for %s",
                appointment.getPatientId(),
                appointment.getAppointmentDateTime().format(DATE_TIME_FORMATTER)
            );
            default -> String.format(
                "Appointment update: Patient %s - %s",
                appointment.getPatientId(),
                notificationType
            );
        };
    }
}