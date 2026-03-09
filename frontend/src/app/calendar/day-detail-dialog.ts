import { Component, inject } from '@angular/core';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DatePipe } from '@angular/common';
import { Absence } from '../shared/models';
import { ABSENCE_TYPE_LABELS } from '../shared/date-utils';

export interface DayDetailData {
    date: Date;
    absences: Absence[];
}

@Component({
    selector: 'app-day-detail-dialog',
    imports: [DatePipe, MatDialogModule, MatButtonModule, MatIconModule],
    template: `
        <div class="day-detail-container">
            <header class="dialog-header">
                <div class="header-main">
                    <div class="header-text">
                        <h2>{{ data.date | date:'fullDate':'':'de-DE' }}</h2>
                        <p>{{ data.absences.length }} Abwesenheiten an diesem Tag</p>
                    </div>
                    <button mat-icon-button mat-dialog-close class="close-btn">
                        <mat-icon>close</mat-icon>
                    </button>
                </div>
            </header>

            <mat-dialog-content class="dialog-body">
                <div class="absence-list">
                    @for (abs of data.absences; track abs.id) {
                        <div class="absence-item">
                            <div class="abs-avatar">
                                {{ (abs.employee_name || '').charAt(0) }}
                            </div>
                            <div class="abs-info">
                                <div class="name">{{ abs.employee_name }}</div>
                                <div class="type-row">
                                    <span class="type-label">{{ getLabel(abs.absence_type) }}</span>
                                    <span class="status-indicator" [attr.data-status]="abs.status"></span>
                                </div>
                            </div>
                        </div>
                    } @empty {
                        <div class="empty-state">
                            <mat-icon class="empty-icon">event_available</mat-icon>
                            <p>An diesem Tag sind alle Mitarbeiter im Dienst.</p>
                        </div>
                    }
                </div>
            </mat-dialog-content>
        </div>
    `,
    styles: [`
        .day-detail-container { 
            padding: 16px; 
            min-width: 380px;
        }
        .dialog-header { 
            margin-block-end: 32px; 
        }
        .header-main { 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start; 
            padding: 0 8px; 
        }
        h2 { 
            margin: 0; 
            font-size: 1.5rem; 
            font-weight: 200; 
            text-transform: capitalize; 
            color: var(--mat-sys-on-surface);
        }
        p { 
            margin: 4px 0 0; 
            color: var(--mat-sys-on-surface-variant); 
            font-size: 0.95rem; 
        }
        .close-btn { 
            margin-block-start: -8px;
            margin-inline-end: -8px; 
            color: var(--mat-sys-on-surface-variant);
        }
        
        .dialog-body { 
            padding: 0 8px 16px !important; 
            overflow-x: hidden;
            overflow-y: auto;
            max-height: 60vh;
        }

        .absence-list { 
            display: flex; 
            flex-direction: column; 
            gap: 12px; 
        }
        .absence-item {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 14px 16px;
            background: var(--mat-sys-surface-container-lowest);
            border: 1px solid var(--mat-sys-outline-variant);
            border-radius: 16px;
        }
        .abs-avatar {
            width: 44px;
            height: 44px;
            background: var(--mat-sys-primary-container);
            color: var(--mat-sys-on-primary-container);
            border-radius: 50%;
            display: grid;
            place-items: center;
            font-weight: 600;
            font-size: 16px;
            flex-shrink: 0;
        }
        .name { font-weight: 600; font-size: 1rem; color: var(--mat-sys-on-surface); }
        .type-row { display: flex; align-items: center; gap: 8px; margin-block-start: 4px; }
        .type-label { font-size: 0.85rem; color: var(--mat-sys-on-surface-variant); }
        
        .status-indicator {
            width: 10px;
            aspect-ratio: 1;
            border-radius: 50%;
        }
        .status-indicator[data-status='approved'] { background: var(--app-status-success); box-shadow: 0 0 8px color-mix(in srgb, var(--app-status-success) 40%, transparent); }
        .status-indicator[data-status='pending'] { background: var(--app-status-warning); box-shadow: 0 0 8px color-mix(in srgb, var(--app-status-warning) 40%, transparent); }

        .empty-state {
            text-align: center;
            padding: 48px 0;
            color: var(--mat-sys-on-surface-variant);
        }
        .empty-icon {
            font-size: 48px !important;
            width: 48px !important;
            aspect-ratio: 1;
            opacity: 0.2;
            margin-block-end: 16px;
            color: var(--mat-sys-primary);
        }
    `]
})
export class DayDetailDialogComponent {
    readonly data = inject<DayDetailData>(MAT_DIALOG_DATA);
    
    getLabel(type: string): string {
        return ABSENCE_TYPE_LABELS[type] ?? type;
    }
}
