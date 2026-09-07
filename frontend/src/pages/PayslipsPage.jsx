import React, { useState } from "react";
import { Modal } from "react-bootstrap";

import EmptyState from "../components/common/EmptyState";
import ErrorState from "../components/common/ErrorState";
import { IconDownload, IconReceipt } from "../components/common/Icons";
import LoadingState from "../components/common/LoadingState";
import PageHeader from "../components/common/PageHeader";
import Pagination from "../components/common/Pagination";
import StatusBadge from "../components/common/StatusBadge";
import PayslipDocument from "../components/payroll/PayslipDocument";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { usePaginatedList } from "../hooks/usePaginatedList";
import { getErrorMessage } from "../services/api";
import { payrollService } from "../services/payrollService";
import { formatCurrency } from "../utils/format";

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function PayslipsPage() {
  const { role } = useAuth();
  const { showToast } = useToast();
  const isManager = role === "ADMIN" || role === "HR";
  const fetcher = isManager ? payrollService.list : payrollService.myPayslips;

  const { data, meta, loading, error, setPage, reload } = usePaginatedList(fetcher);
  const [payslip, setPayslip] = useState(null);
  const [loadingPayslip, setLoadingPayslip] = useState(false);

  const viewPayslip = async (payrollId) => {
    setLoadingPayslip(true);
    try {
      const { data } = await payrollService.payslip(payrollId);
      setPayslip(data);
    } catch (err) {
      showToast(getErrorMessage(err), "danger");
    } finally {
      setLoadingPayslip(false);
    }
  };

  const handlePrint = () => window.print();

  return (
    <div>
      <PageHeader title="Payslips" subtitle={isManager ? "View and download payslips for any payroll record." : "View and download your payslips."} />

      <div className="pd-card">
        {loading && <LoadingState label="Loading payslips…" />}
        {!loading && error && <ErrorState message={error} onRetry={reload} />}
        {!loading && !error && data.length === 0 && (
          <EmptyState title="No payslips yet" message="Payslips appear here once payroll has been generated." />
        )}
        {!loading && !error && data.length > 0 && (
          <div className="table-responsive">
            <table className="table pd-table mb-0">
              <thead>
                <tr>
                  {isManager && <th>Employee</th>}
                  <th>Period</th><th>Net Salary</th><th>Status</th><th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p.id}>
                    {isManager && <td>{p.employee_detail?.full_name}</td>}
                    <td className="pd-mono">{MONTHS[p.month]} {p.year}</td>
                    <td className="pd-amount fw-semibold">{formatCurrency(p.net_salary)}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-pd-primary d-inline-flex align-items-center gap-1" onClick={() => viewPayslip(p.id)}>
                        <IconReceipt width="14" height="14" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination meta={meta} onPageChange={setPage} />

      <Modal show={!!payslip || loadingPayslip} onHide={() => setPayslip(null)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title style={{ fontFamily: "var(--pd-font-display)", fontSize: 17 }}>Payslip</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingPayslip && <LoadingState label="Loading payslip…" />}
          {!loadingPayslip && payslip && <PayslipDocument payslip={payslip} />}
        </Modal.Body>
        <Modal.Footer>
          <button type="button" className="btn btn-light border" onClick={() => setPayslip(null)}>Close</button>
          <button type="button" className="btn btn-pd-primary d-flex align-items-center gap-1" onClick={handlePrint}>
            <IconDownload width="15" height="15" /> Print / Save as PDF
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
