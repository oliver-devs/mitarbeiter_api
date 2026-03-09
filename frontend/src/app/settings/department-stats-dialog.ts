import { Component, inject, computed } from '@angular/core';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Department } from '../shared/models';

export interface DepartmentStatsData {
    departments: Department[];
}

@Component({
    selector: 'app-department-stats-dialog',
    imports: [MatDialogModule, MatButtonModule, MatIconModule, MatTooltipModule],
    template: `
        <div class="stats-dialog-container">
            <header class="dialog-header">
                <div class="header-main">
                    <div class="header-text">
                        <h2>Unternehmens-Statistik</h2>
                        <p>Verteilung der Mitarbeiter nach Abteilungen</p>
                    </div>
                    <button mat-icon-button mat-dialog-close class="close-btn">
                        <mat-icon>close</mat-icon>
                    </button>
                </div>
            </header>

            <mat-dialog-content class="dialog-body">
                <div class="bar-chart">
                    @for (dept of data.departments; track dept.id) {
                        <div class="chart-row">
                            <div class="chart-label" [matTooltip]="dept.name">{{ dept.name }}</div>
                            <div class="chart-bar-container">
                                <div class="chart-bar" [style.width.%]="((dept.employee_count || 0) / maxCount()) * 100"></div>
                            </div>
                            <div class="chart-value">{{ dept.employee_count || 0 }}</div>
                        </div>
                    }
                </div>
            </mat-dialog-content>
        </div>
    `,
    styles: [`
        .stats-dialog-container { 
            padding: 16px; 
            position: relative;
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
        .header-text h2 { 
            margin: 0; 
            font-size: 1.5rem;
            font-weight: 600; 
            color: var(--mat-sys-on-surface);
        }
        .header-text p { 
            margin: 8px 0 0; 
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
        }

        .bar-chart {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        .chart-row {
            display: flex;
            align-items: center;
            gap: 16px;
        }
        .chart-label {
            width: 140px;
            font-size: 0.9rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-weight: 500;
        }
        .chart-bar-container {
            flex: 1;
            height: 10px;
            background: var(--mat-sys-surface-container-highest);
            border-radius: 5px;
            overflow: hidden;
        }
        .chart-bar {
            height: 100%;
            background: var(--mat-sys-primary);
            border-radius: 5px;
            transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .chart-value {
            width: 30px;
            text-align: end;
            font-weight: 700;
            font-size: 0.9rem;
        }
    `]
})
export class DepartmentStatsDialogComponent {
    readonly data = inject<DepartmentStatsData>(MAT_DIALOG_DATA);
    
    readonly maxCount = computed(() => {
        if (!this.data.departments || this.data.departments.length === 0) return 1;
        return Math.max(...this.data.departments.map(d => d.employee_count || 0));
    });
}
