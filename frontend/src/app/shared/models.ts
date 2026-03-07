export interface Position {
    id: number;
    title: string;
    description?: string;
    group?: number;
    can_approve?: boolean;
    requires_dual_approval?: boolean;
}

export interface Department {
    id?: number;
    name: string;
    description: string;
    employee_count?: number;
}

export interface Employee {
    id?: number;
    first_name: string;
    last_name: string;
    email: string;
    department: string | number;
    position?: string | number;
    is_approved?: boolean;
}

export interface Absence {
    id?: number;
    employee: number;
    employee_name?: string;
    absence_type: 'vacation' | 'sick' | 'homeoffice' | 'other';
    start_date: string;
    end_date: string;
    note?: string;
    status?: 'pending' | 'approved' | 'denied';
    approvals_required?: number;
    approved_by_names?: string[];
    approval_count?: number;
    created_at?: string;
}

export interface CreateEmployeeResponse extends Employee {
    initial_username: string;
    initial_password: string;
}
