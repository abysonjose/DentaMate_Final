import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';
import { HeadNurseService } from '../../services/head-nurse.service';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: Date;
  read: boolean;
  type: 'sent' | 'received';
}

@Component({
  selector: 'app-communication-center',
  templateUrl: './communication-center.component.html',
  styleUrls: ['./communication-center.component.scss']
})
export class CommunicationCenterComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  messages: Message[] = [];
  filteredMessages: Message[] = [];
  messageForm: FormGroup;
  
  filterOptions = {
    type: 'all',
    priority: 'all',
    read: 'all',
    searchTerm: ''
  };

  typeOptions = [
    { value: 'all', label: 'All Messages' },
    { value: 'received', label: 'Received' },
    { value: 'sent', label: 'Sent' }
  ];

  priorityOptions = [
    { value: 'all', label: 'All Priorities' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' }
  ];

  readOptions = [
    { value: 'all', label: 'All Messages' },
    { value: 'unread', label: 'Unread Only' },
    { value: 'read', label: 'Read Only' }
  ];

  recipients = [
    { id: '1', name: 'Dr. Sarah Johnson', role: 'Doctor', department: 'General Dentistry' },
    { id: '2', name: 'Dr. Michael Chen', role: 'Doctor', department: 'Orthodontics' },
    { id: '3', name: 'Nurse Alice Brown', role: 'Nurse', department: 'General Care' },
    { id: '4', name: 'Reception Desk', role: 'Reception', department: 'Front Office' },
    { id: '5', name: 'Branch Admin', role: 'Admin', department: 'Administration' }
  ];

  communicationMetrics = {
    totalMessages: 0,
    unreadMessages: 0,
    urgentMessages: 0,
    todayMessages: 0
  };

  constructor(
    private headNurseService: HeadNurseService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.messageForm = this.fb.group({
      recipientId: ['', Validators.required],
      message: ['', [Validators.required, Validators.minLength(5)]],
      priority: ['medium', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadMessages();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadMessages(): void {
    this.headNurseService.getMessages()
      .pipe(takeUntil(this.destroy$))
      .subscribe(messages => {
        this.messages = messages;
        this.updateMetrics();
        this.applyFilters();
      });
  }

  private updateMetrics(): void {
    this.communicationMetrics.totalMessages = this.messages.length;
    this.communicationMetrics.unreadMessages = this.messages.filter(m => !m.read && m.type === 'received').length;
    this.communicationMetrics.urgentMessages = this.messages.filter(m => m.priority === 'urgent' && !m.read).length;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.communicationMetrics.todayMessages = this.messages.filter(m => 
      new Date(m.timestamp) >= today
    ).length;
  }

  applyFilters(): void {
    this.filteredMessages = this.messages.filter(message => {
      const matchesType = this.filterOptions.type === 'all' || message.type === this.filterOptions.type;
      const matchesPriority = this.filterOptions.priority === 'all' || message.priority === this.filterOptions.priority;
      const matchesRead = this.filterOptions.read === 'all' || 
        (this.filterOptions.read === 'read' && message.read) ||
        (this.filterOptions.read === 'unread' && !message.read);
      const matchesSearch = !this.filterOptions.searchTerm || 
        message.message.toLowerCase().includes(this.filterOptions.searchTerm.toLowerCase()) ||
        message.senderName.toLowerCase().includes(this.filterOptions.searchTerm.toLowerCase()) ||
        message.recipientName.toLowerCase().includes(this.filterOptions.searchTerm.toLowerCase());
      
      return matchesType && matchesPriority && matchesRead && matchesSearch;
    });

    // Sort by timestamp (newest first)
    this.filteredMessages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  sendMessage(): void {
    if (this.messageForm.valid) {
      const formValue = this.messageForm.value;
      const recipient = this.recipients.find(r => r.id === formValue.recipientId);
      
      this.headNurseService.sendMessage(
        formValue.recipientId,
        formValue.message,
        formValue.priority
      ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open(`Message sent to ${recipient?.name}`, 'Close', { duration: 3000 });
          this.messageForm.reset();
          this.messageForm.patchValue({ priority: 'medium' });
          this.loadMessages();
        },
        error: (error) => {
          this.snackBar.open('Failed to send message', 'Close', { duration: 3000 });
        }
      });
    }
  }

  markAsRead(message: Message): void {
    if (!message.read && message.type === 'received') {
      message.read = true;
      this.updateMetrics();
    }
  }

  getPriorityColor(priority: string): string {
    const colors = {
      'low': 'basic',
      'medium': 'primary',
      'high': 'accent',
      'urgent': 'warn'
    };
    return colors[priority] || 'basic';
  }

  getPriorityIcon(priority: string): string {
    const icons = {
      'low': 'low_priority',
      'medium': 'priority_high',
      'high': 'priority_high',
      'urgent': 'emergency'
    };
    return icons[priority] || 'priority_high';
  }

  getRecipientInfo(recipientId: string) {
    return this.recipients.find(r => r.id === recipientId);
  }

  refreshMessages(): void {
    this.loadMessages();
  }
}