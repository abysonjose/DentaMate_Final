import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PatientService } from '../../services/patient.service';

@Component({
  selector: 'app-support-help',
  template: `
    <div class="support-help">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>Support & Help</h1>
          <p class="subtitle">Get assistance and find answers to your questions</p>
        </div>
      </div>

      <!-- Main Content -->
      <div class="support-content">
        
        <!-- Quick Help Cards -->
        <div class="quick-help-section">
          <h2>Quick Help</h2>
          <div class="help-cards-grid">
            
            <mat-card class="help-card" (click)="scrollToSection('faq')">
              <mat-card-content>
                <mat-icon color="primary">help</mat-icon>
                <h3>FAQ</h3>
                <p>Find answers to commonly asked questions</p>
              </mat-card-content>
            </mat-card>

            <mat-card class="help-card" (click)="scrollToSection('contact')">
              <mat-card-content>
                <mat-icon color="accent">contact_support</mat-icon>
                <h3>Contact Us</h3>
                <p>Get in touch with our support team</p>
              </mat-card-content>
            </mat-card>

            <mat-card class="help-card" (click)="scrollToSection('clinic-info')">
              <mat-card-content>
                <mat-icon color="warn">location_on</mat-icon>
                <h3>Clinic Info</h3>
                <p>Find clinic locations and contact details</p>
              </mat-card-content>
            </mat-card>

            <mat-card class="help-card" (click)="scrollToSection('support-request')">
              <mat-card-content>
                <mat-icon color="primary">support_agent</mat-icon>
                <h3>Submit Request</h3>
                <p>Send us a detailed support request</p>
              </mat-card-content>
            </mat-card>

          </div>
        </div>

        <!-- FAQ Section -->
        <mat-card class="faq-section" id="faq">
          <mat-card-header>
            <mat-icon mat-card-avatar color="primary">help</mat-icon>
            <mat-card-title>Frequently Asked Questions</mat-card-title>
            <mat-card-subtitle>Common questions and answers</mat-card-subtitle>
          </mat-card-header>
          
          <mat-card-content>
            <mat-accordion>
              
              <mat-expansion-panel *ngFor="let faq of faqs">
                <mat-expansion-panel-header>
                  <mat-panel-title>{{faq.question}}</mat-panel-title>
                </mat-expansion-panel-header>
                <p>{{faq.answer}}</p>
              </mat-expansion-panel>

            </mat-accordion>
          </mat-card-content>
        </mat-card>

        <!-- Contact Information -->
        <mat-card class="contact-section" id="contact">
          <mat-card-header>
            <mat-icon mat-card-avatar color="accent">contact_support</mat-icon>
            <mat-card-title>Contact Information</mat-card-title>
            <mat-card-subtitle>Get in touch with us</mat-card-subtitle>
          </mat-card-header>
          
          <mat-card-content>
            <div class="contact-methods">
              
              <div class="contact-method">
                <mat-icon color="primary">phone</mat-icon>
                <div class="contact-details">
                  <h4>Phone Support</h4>
                  <p>+91 98765 43210</p>
                  <span class="availability">Available 24/7 for emergencies</span>
                </div>
              </div>

              <div class="contact-method">
                <mat-icon color="accent">email</mat-icon>
                <div class="contact-details">
                  <h4>Email Support</h4>
                  <p>support@dentamate.com</p>
                  <span class="availability">Response within 24 hours</span>
                </div>
              </div>

              <div class="contact-method">
                <mat-icon color="warn">chat</mat-icon>
                <div class="contact-details">
                  <h4>Live Chat</h4>
                  <p>Available on website</p>
                  <span class="availability">Mon-Fri, 9 AM - 6 PM</span>
                </div>
              </div>

              <div class="contact-method">
                <mat-icon color="primary">schedule</mat-icon>
                <div class="contact-details">
                  <h4>Emergency</h4>
                  <p>+91 98765 43211</p>
                  <span class="availability">24/7 Emergency hotline</span>
                </div>
              </div>

            </div>
          </mat-card-content>
        </mat-card>

        <!-- Clinic Information -->
        <mat-card class="clinic-info-section" id="clinic-info">
          <mat-card-header>
            <mat-icon mat-card-avatar color="warn">location_on</mat-icon>
            <mat-card-title>Clinic Information</mat-card-title>
            <mat-card-subtitle>Our locations and services</mat-card-subtitle>
          </mat-card-header>
          
          <mat-card-content>
            <div class="clinic-info" *ngIf="clinicInfo">
              
              <div class="info-section">
                <h3>Main Clinic</h3>
                <div class="clinic-details">
                  <div class="detail-row">
                    <mat-icon>location_on</mat-icon>
                    <span>{{clinicInfo.address}}</span>
                  </div>
                  <div class="detail-row">
                    <mat-icon>phone</mat-icon>
                    <span>{{clinicInfo.phone}}</span>
                  </div>
                  <div class="detail-row">
                    <mat-icon>email</mat-icon>
                    <span>{{clinicInfo.email}}</span>
                  </div>
                </div>
              </div>

              <div class="info-section">
                <h3>Working Hours</h3>
                <div class="hours-grid">
                  <div *ngFor="let hour of clinicInfo.workingHours" class="hour-row">
                    <span class="day">{{hour.day}}</span>
                    <span class="time">{{hour.hours}}</span>
                  </div>
                </div>
              </div>

              <div class="info-section">
                <h3>Services</h3>
                <div class="services-list">
                  <mat-chip *ngFor="let service of clinicInfo.services" color="primary" selected>
                    {{service}}
                  </mat-chip>
                </div>
              </div>

            </div>
          </mat-card-content>
        </mat-card>

        <!-- Support Request Form -->
        <mat-card class="support-request-section" id="support-request">
          <mat-card-header>
            <mat-icon mat-card-avatar color="primary">support_agent</mat-icon>
            <mat-card-title>Submit Support Request</mat-card-title>
            <mat-card-subtitle>Send us a detailed message</mat-card-subtitle>
          </mat-card-header>
          
          <mat-card-content>
            <form [formGroup]="supportForm" class="support-form">
              
              <!-- Request Type -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Request Type</mat-label>
                <mat-select formControlName="type">
                  <mat-option value="TECHNICAL">Technical Issue</mat-option>
                  <mat-option value="BILLING">Billing Question</mat-option>
                  <mat-option value="APPOINTMENT">Appointment Help</mat-option>
                  <mat-option value="MEDICAL">Medical Query</mat-option>
                  <mat-option value="FEEDBACK">Feedback</mat-option>
                  <mat-option value="OTHER">Other</mat-option>
                </mat-select>
                <mat-error *ngIf="supportForm.get('type')?.hasError('required')">
                  Please select a request type
                </mat-error>
              </mat-form-field>

              <!-- Priority -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Priority</mat-label>
                <mat-select formControlName="priority">
                  <mat-option value="LOW">Low - General inquiry</mat-option>
                  <mat-option value="MEDIUM">Medium - Need assistance</mat-option>
                  <mat-option value="HIGH">High - Urgent issue</mat-option>
                  <mat-option value="EMERGENCY">Emergency - Immediate attention</mat-option>
                </mat-select>
                <mat-error *ngIf="supportForm.get('priority')?.hasError('required')">
                  Please select priority level
                </mat-error>
              </mat-form-field>

              <!-- Subject -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Subject</mat-label>
                <input matInput formControlName="subject" placeholder="Brief description of your issue">
                <mat-error *ngIf="supportForm.get('subject')?.hasError('required')">
                  Subject is required
                </mat-error>
              </mat-form-field>

              <!-- Message -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Message</mat-label>
                <textarea matInput formControlName="message" rows="6" 
                          placeholder="Please provide detailed information about your request..."></textarea>
                <mat-error *ngIf="supportForm.get('message')?.hasError('required')">
                  Message is required
                </mat-error>
                <mat-error *ngIf="supportForm.get('message')?.hasError('minlength')">
                  Message must be at least 10 characters long
                </mat-error>
              </mat-form-field>

              <!-- Contact Preference -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Preferred Contact Method</mat-label>
                <mat-select formControlName="contactMethod">
                  <mat-option value="EMAIL">Email</mat-option>
                  <mat-option value="PHONE">Phone Call</mat-option>
                  <mat-option value="SMS">SMS</mat-option>
                </mat-select>
                <mat-error *ngIf="supportForm.get('contactMethod')?.hasError('required')">
                  Please select contact method
                </mat-error>
              </mat-form-field>

            </form>
          </mat-card-content>
          
          <mat-card-actions>
            <button mat-button (click)="resetForm()">
              <mat-icon>refresh</mat-icon>
              Reset
            </button>
            <button mat-raised-button color="primary" 
                    (click)="submitSupportRequest()" 
                    [disabled]="supportForm.invalid || submitting">
              <mat-spinner *ngIf="submitting" diameter="20"></mat-spinner>
              <mat-icon *ngIf="!submitting">send</mat-icon>
              <span *ngIf="!submitting">Submit Request</span>
              <span *ngIf="submitting">Submitting...</span>
            </button>
          </mat-card-actions>
        </mat-card>

        <!-- Additional Resources -->
        <mat-card class="resources-section">
          <mat-card-header>
            <mat-icon mat-card-avatar color="accent">library_books</mat-icon>
            <mat-card-title>Additional Resources</mat-card-title>
            <mat-card-subtitle>Helpful links and information</mat-card-subtitle>
          </mat-card-header>
          
          <mat-card-content>
            <div class="resources-grid">
              
              <div class="resource-item">
                <mat-icon color="primary">description</mat-icon>
                <div class="resource-content">
                  <h4>Patient Guide</h4>
                  <p>Complete guide for using DentaMate</p>
                  <button mat-button color="primary">Download PDF</button>
                </div>
              </div>

              <div class="resource-item">
                <mat-icon color="accent">video_library</mat-icon>
                <div class="resource-content">
                  <h4>Video Tutorials</h4>
                  <p>Step-by-step video guides</p>
                  <button mat-button color="primary">Watch Videos</button>
                </div>
              </div>

              <div class="resource-item">
                <mat-icon color="warn">security</mat-icon>
                <div class="resource-content">
                  <h4>Privacy Policy</h4>
                  <p>How we protect your data</p>
                  <button mat-button color="primary">Read Policy</button>
                </div>
              </div>

              <div class="resource-item">
                <mat-icon color="primary">gavel</mat-icon>
                <div class="resource-content">
                  <h4>Terms of Service</h4>
                  <p>Terms and conditions</p>
                  <button mat-button color="primary">View Terms</button>
                </div>
              </div>

            </div>
          </mat-card-content>
        </mat-card>

      </div>
    </div>
  `,
  styleUrls: ['./support-help.component.scss']
})
export class SupportHelpComponent implements OnInit {
  supportForm: FormGroup;
  submitting = false;
  clinicInfo: any = null;

  faqs = [
    {
      question: 'How do I book an appointment?',
      answer: 'You can book an appointment by going to the Appointments section and clicking "Book New Appointment". Select your preferred doctor, date, and time slot.'
    },
    {
      question: 'How do I check my queue status?',
      answer: 'After checking in for your appointment, you can view your queue status in the "Queue Status" section. This shows your token number and estimated wait time.'
    },
    {
      question: 'Can I reschedule my appointment?',
      answer: 'Yes, you can reschedule appointments up to 24 hours before the scheduled time. Go to your appointments and click "Reschedule" next to the appointment.'
    },
    {
      question: 'How do I download my prescriptions?',
      answer: 'Visit the Prescriptions section and click "Download" next to any prescription. You can download them as PDF files for your records.'
    },
    {
      question: 'How do I make payments online?',
      answer: 'Go to the Billing & Payments section, select the bill you want to pay, and click "Pay Now". We accept UPI, cards, net banking, and digital wallets.'
    },
    {
      question: 'How do I update my profile information?',
      answer: 'Visit the Profile section to update your personal information, contact details, and emergency contact information.'
    },
    {
      question: 'What should I do in case of a dental emergency?',
      answer: 'For dental emergencies, call our 24/7 emergency hotline at +91 98765 43211. For severe cases, visit the nearest emergency room.'
    },
    {
      question: 'How do I access my medical records?',
      answer: 'Your medical records are available in the Medical Records section. You can view visit history, download reports, and access X-rays and other attachments.'
    }
  ];

  constructor(
    private fb: FormBuilder,
    private patientService: PatientService,
    private snackBar: MatSnackBar
  ) {
    this.supportForm = this.fb.group({
      type: ['', Validators.required],
      priority: ['MEDIUM', Validators.required],
      subject: ['', Validators.required],
      message: ['', [Validators.required, Validators.minLength(10)]],
      contactMethod: ['EMAIL', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadClinicInfo();
  }

  private loadClinicInfo(): void {
    this.patientService.getClinicInfo().subscribe({
      next: (info) => {
        this.clinicInfo = info;
      },
      error: (error) => {
        console.error('Error loading clinic info:', error);
        // Set default clinic info
        this.clinicInfo = {
          address: '123 Dental Street, Medical District, City - 123456',
          phone: '+91 98765 43210',
          email: 'info@dentamate.com',
          workingHours: [
            { day: 'Monday - Friday', hours: '9:00 AM - 8:00 PM' },
            { day: 'Saturday', hours: '9:00 AM - 6:00 PM' },
            { day: 'Sunday', hours: '10:00 AM - 4:00 PM' }
          ],
          services: [
            'General Dentistry',
            'Orthodontics',
            'Oral Surgery',
            'Pediatric Dentistry',
            'Cosmetic Dentistry',
            'Dental Implants'
          ]
        };
      }
    });
  }

  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  submitSupportRequest(): void {
    if (this.supportForm.invalid) return;

    this.submitting = true;
    const requestData = this.supportForm.value;

    this.patientService.submitSupportRequest(requestData).subscribe({
      next: (response) => {
        this.submitting = false;
        this.supportForm.reset({
          priority: 'MEDIUM',
          contactMethod: 'EMAIL'
        });
        this.snackBar.open('Support request submitted successfully! We will get back to you soon.', 'Close', {
          duration: 5000,
          panelClass: ['success-snackbar']
        });
      },
      error: (error) => {
        console.error('Error submitting support request:', error);
        this.submitting = false;
        this.snackBar.open('Error submitting request. Please try again.', 'Close', { duration: 3000 });
      }
    });
  }

  resetForm(): void {
    this.supportForm.reset({
      priority: 'MEDIUM',
      contactMethod: 'EMAIL'
    });
  }
}