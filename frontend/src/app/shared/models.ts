export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

export interface Position {
    id: number;
    department: number;
    title: string;
    description?: string;
    is_management?: boolean;
    can_approve?: boolean;
    requires_dual_approval?: boolean;
    employee_count?: number;
}

export interface Department {
    id?: number;
    name: string;
    description: string;
    employee_count?: number;
    position_count?: number;
}

export interface Employee {
    id?: number;
    first_name: string;
    last_name: string;
    email: string;
    gender?: 'male' | 'female' | 'diverse';
    department: number;
    department_name?: string;
    position?: number | null;
    position_title?: string | null;
    birthday?: string;
    current_status?: 'online' | 'busy' | 'homeoffice' | 'break' | 'offline' | 'sick' | 'vacation' | 'absent';
    created_at?: string;
}

export interface TimeBreak {
    id?: number;
    start_time: string;
    end_time?: string | null;
}

export interface TimeEntry {
    id?: number;
    employee: number;
    employee_name?: string;
    date?: string;
    start_time: string;
    end_time?: string | null;
    breaks?: TimeBreak[];
    is_manual_edit?: boolean;
    edit_reason?: string;
}

export interface TimeCorrectionRequest {
    id?: number;
    employee?: number;
    employee_name?: string;
    time_entry?: number | null;
    new_start_time: string;
    new_end_time: string;
    reason: string;
    status?: 'pending' | 'approved' | 'denied';
    created_at?: string;
}

export interface Absence {
    id?: number;
    employee: number;
    employee_name?: string;
    absence_type: 'vacation' | 'sick' | 'homeoffice' | 'meeting' | 'other';
    start_date: string;
    end_date: string;
    note?: string;
    status?: 'pending' | 'approved' | 'denied';
    approvals_required?: number;
    approved_by_names?: string[];
    approval_count?: number;
    created_at?: string;
}

export interface CreateEmployeeResponse {
    employee: Employee;
    credentials: {
        username: string;
        password: string;
        notice: string;
    };
}
