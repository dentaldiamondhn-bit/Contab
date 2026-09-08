"use client";

import { useState, useEffect, useCallback } from "react";
import type { Employee, Department, Position } from "@/types/hr";

// ==================== useEmployees ====================

export function useEmployees(companyId: string) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/companies/${companyId}/employees`);
      if (!res.ok) throw new Error("Error fetching employees");
      const data = await res.json();
      setEmployees(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) fetchEmployees();
  }, [companyId, fetchEmployees]);

  const createEmployee = useCallback(async (body: any): Promise<Employee | null> => {
    try {
      const res = await fetch(`/api/companies/${companyId}/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Error creating employee");
      const emp = await res.json();
      setEmployees((prev) => [emp, ...prev]);
      return emp;
    } catch {
      return null;
    }
  }, [companyId]);

  const updateEmployee = useCallback(async (id: string, body: any): Promise<boolean> => {
    try {
      const res = await fetch(`/api/companies/${companyId}/employees`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      if (!res.ok) throw new Error("Error updating employee");
      setEmployees((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...body } : e))
      );
      return true;
    } catch {
      return false;
    }
  }, [companyId]);

  const deleteEmployee = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/companies/${companyId}/employees?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Error deleting employee");
      setEmployees((prev) => prev.filter((e) => e.id !== id));
      return true;
    } catch {
      return false;
    }
  }, [companyId]);

  return {
    employees,
    loading,
    error,
    fetchEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee,
  };
}

// ==================== useDepartments ====================

export function useDepartments(companyId: string) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDepartments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/companies/${companyId}/hr/departments`);
      if (!res.ok) throw new Error("Error fetching departments");
      const data = await res.json();
      setDepartments(
        data.map((d: any) => ({
          id: d.id,
          name: d.name,
          description: d.description,
          manager: d.manager,
          createdAt: d.created_at,
          parentId: d.parent_id,
        }))
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) fetchDepartments();
  }, [companyId, fetchDepartments]);

  const createDepartment = useCallback(async (body: any): Promise<Department | null> => {
    try {
      const res = await fetch(`/api/companies/${companyId}/hr/departments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Error creating department");
      const dept = await res.json();
      const mapped: Department = {
        id: dept.id,
        name: dept.name,
        description: dept.description,
        manager: dept.manager,
        createdAt: dept.created_at,
        parentId: dept.parent_id,
      };
      setDepartments((prev) => [...prev, mapped]);
      return mapped;
    } catch {
      return null;
    }
  }, [companyId]);

  const updateDepartment = useCallback(async (id: string, body: any): Promise<boolean> => {
    try {
      const res = await fetch(`/api/companies/${companyId}/hr/departments`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      if (!res.ok) throw new Error("Error updating department");
      setDepartments((prev) =>
        prev.map((d) => (d.id === id ? { ...d, ...body } : d))
      );
      return true;
    } catch {
      return false;
    }
  }, [companyId]);

  const deleteDepartment = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/companies/${companyId}/hr/departments?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Error deleting department");
      setDepartments((prev) => prev.filter((d) => d.id !== id));
      return true;
    } catch {
      return false;
    }
  }, [companyId]);

  return {
    departments,
    loading,
    error,
    fetchDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
  };
}

// ==================== usePositions ====================

export function usePositions(companyId: string) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPositions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/companies/${companyId}/hr/positions`);
      if (!res.ok) throw new Error("Error fetching positions");
      const data = await res.json();
      setPositions(
        data.map((p: any) => ({
          id: p.id,
          name: p.name,
          department: p.department,
          description: p.description,
          minSalary: p.min_salary,
          maxSalary: p.max_salary,
          parentId: p.parent_id,
        }))
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) fetchPositions();
  }, [companyId, fetchPositions]);

  const createPosition = useCallback(async (body: any): Promise<Position | null> => {
    try {
      const res = await fetch(`/api/companies/${companyId}/hr/positions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Error creating position");
      const pos = await res.json();
      const mapped: Position = {
        id: pos.id,
        name: pos.name,
        department: pos.department,
        description: pos.description,
        minSalary: pos.min_salary,
        maxSalary: pos.max_salary,
        parentId: pos.parent_id,
      };
      setPositions((prev) => [...prev, mapped]);
      return mapped;
    } catch {
      return null;
    }
  }, [companyId]);

  const updatePosition = useCallback(async (id: string, body: any): Promise<boolean> => {
    try {
      const res = await fetch(`/api/companies/${companyId}/hr/positions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      if (!res.ok) throw new Error("Error updating position");
      setPositions((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...body } : p))
      );
      return true;
    } catch {
      return false;
    }
  }, [companyId]);

  const deletePosition = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/companies/${companyId}/hr/positions?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Error deleting position");
      setPositions((prev) => prev.filter((p) => p.id !== id));
      return true;
    } catch {
      return false;
    }
  }, [companyId]);

  return {
    positions,
    loading,
    error,
    fetchPositions,
    createPosition,
    updatePosition,
    deletePosition,
  };
}
