"use client";

import { useState, useEffect } from "react";

interface SeatCounts {
  EXECUTIVE: number;
  MANAGER: number;
  HR: number;
  billableTotal: number;
}

interface InvoiceEstimate {
  seatCounts: SeatCounts;
  billedSeats: number;
  monthlyTotal: number;
  interval: "monthly" | "annual";
}

interface Subscription {
  id: string;
  plan: string;
  status: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  stripeSubscriptionId: string | null;
}

interface BillingData {
  subscription: Subscription | null;
  seatCounts: SeatCounts;
  estimate: InvoiceEstimate;
  trialDaysLeft: number;
  isTrialing: boolean;
  needsPayment: boolean;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  TRIALING: { label: "Free trial", color: "text-blue-600 bg-blue-50" },
  ACTIVE: { label: "Active", color: "text-green-600 bg-green-50" },
  PAST_DUE: { label: "Past due", color: "text-red-600 bg-red-50" },
  CANCELED: { label: "Canceled", color: "text-gray-500 bg-gray-100" },
};

export default function BillingPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">("monthly");

  useEffect(() => {
    fetch("/api/workspaces")
      .then((r) => r.json())
      .then((workspaces) => {
        if (!workspaces?.length) return;
        const ws =
          workspaces.find((w: { role: string }) => w.role === "MANAGER") ??
          workspaces[0];
        setWorkspaceId(ws.id);
      })
      .catch(() => setError("Failed to load workspace"));
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    fetch(`/api/billing?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((data) => {
        setBilling(data);
        if (data.subscription?.plan === "ANNUAL") setBillingInterval("annual");
      })
      .catch(() => setError("Failed to load billing info"))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const handleUpgrade = async () => {
    if (!workspaceId) return;
    setUpgrading(true);
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, interval: billingInterval }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setError("Could not start checkout. Please try again.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setUpgrading(false);
    }
  };

  const handlePortal = async () => {
    if (!workspaceId) return;
    setUpgrading(true);
    try {
      const res = await fetch("/api/billing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setUpgrading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-3xl">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-32" />
          <div className="h-32 bg-gray-100 rounded-lg" />
          <div className="h-40 bg-gray-100 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-3xl">
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!billing) return null;

  const { subscription, seatCounts, estimate, trialDaysLeft, isTrialing, needsPayment } = billing;
  const isPaid = subscription?.stripeSubscriptionId != null;
  const statusMeta = subscription ? STATUS_LABELS[subscription.status] ?? STATUS_LABELS.TRIALING : STATUS_LABELS.TRIALING;

  const annualSavings = Math.round(
    (estimate.billedSeats * 39 * 12 -
      estimate.billedSeats * 31 * 12) /
      (estimate.billedSeats * 39 * 12) *
      100
  );

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Billing</h1>
        <p className="text-sm text-gray-400 mt-0.5">Per-seat pricing based on leadership roles</p>
      </div>

      {/* Trial / status banner */}
      {isTrialing && (
        <div
          className={`px-4 py-3 rounded-md text-sm font-medium ${
            needsPayment
              ? "bg-amber-50 border border-amber-200 text-amber-800"
              : "bg-blue-50 border border-blue-200 text-blue-800"
          }`}
        >
          {trialDaysLeft > 0
            ? `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left in your free trial. No credit card required until trial ends.`
            : "Your free trial has ended. Add a payment method to continue using Manifest."}
        </div>
      )}

      {subscription?.status === "PAST_DUE" && (
        <div className="px-4 py-3 rounded-md text-sm font-medium bg-red-50 border border-red-200 text-red-800">
          Payment failed. Please update your payment method to keep your workspace active.
        </div>
      )}

      {/* Current plan card */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-gray-900">
              {isTrialing
                ? "Free trial"
                : subscription?.plan === "ANNUAL"
                ? "Annual plan"
                : "Monthly plan"}
            </p>
            {subscription?.currentPeriodEnd && !isTrialing && (
              <p className="text-xs text-gray-400 mt-0.5">
                Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
            {isTrialing && subscription?.trialEndsAt && (
              <p className="text-xs text-gray-400 mt-0.5">
                Trial ends {new Date(subscription.trialEndsAt).toLocaleDateString()}
              </p>
            )}
          </div>
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusMeta.color}`}
          >
            {statusMeta.label}
          </span>
        </div>

        {/* Seat breakdown */}
        <div className="border border-gray-100 rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Role</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Seats</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Rate</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <tr>
                <td className="px-4 py-3 text-gray-700">Executive / CEO</td>
                <td className="px-4 py-3 text-right text-gray-700">{seatCounts.EXECUTIVE}</td>
                <td className="px-4 py-3 text-right text-gray-400">
                  ${billingInterval === "annual" ? "63" : "79"}/mo
                </td>
                <td className="px-4 py-3 text-right text-gray-700">
                  ${seatCounts.EXECUTIVE * (billingInterval === "annual" ? 63 : 79)}/mo
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-700">Manager</td>
                <td className="px-4 py-3 text-right text-gray-700">{seatCounts.MANAGER}</td>
                <td className="px-4 py-3 text-right text-gray-400">
                  ${billingInterval === "annual" ? "31" : "39"}/mo
                </td>
                <td className="px-4 py-3 text-right text-gray-700">
                  ${seatCounts.MANAGER * (billingInterval === "annual" ? 31 : 39)}/mo
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-700">HR</td>
                <td className="px-4 py-3 text-right text-gray-700">{seatCounts.HR}</td>
                <td className="px-4 py-3 text-right text-gray-400">
                  ${billingInterval === "annual" ? "31" : "39"}/mo
                </td>
                <td className="px-4 py-3 text-right text-gray-700">
                  ${seatCounts.HR * (billingInterval === "annual" ? 31 : 39)}/mo
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-400">Team Members (IC)</td>
                <td colSpan={3} className="px-4 py-3 text-right text-gray-400">Free</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-100">
                <td colSpan={2} className="px-4 py-3 text-sm font-medium text-gray-700">
                  Estimated monthly total
                  {estimate.billedSeats > seatCounts.billableTotal && (
                    <span className="ml-1 text-xs text-gray-400">
                      (min {estimate.billedSeats} seats)
                    </span>
                  )}
                </td>
                <td colSpan={2} className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                  ${estimate.monthlyTotal}/mo
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Upgrade / manage billing */}
      {!isPaid ? (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="text-sm font-medium text-gray-900 mb-3">Start subscription</h2>
          <p className="text-sm text-gray-500 mb-4">
            Add a payment method to keep your workspace active after the trial. No charge until trial ends.
          </p>

          {/* Interval toggle */}
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setBillingInterval("monthly")}
              className={`flex-1 py-2 text-sm rounded-md border transition-colors ${
                billingInterval === "monthly"
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval("annual")}
              className={`flex-1 py-2 text-sm rounded-md border transition-colors ${
                billingInterval === "annual"
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              Annual
              <span className="ml-1.5 text-xs font-medium text-green-600">
                save ~{annualSavings}%
              </span>
            </button>
          </div>

          <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-md">
            <span className="text-sm text-gray-600">Estimated first charge</span>
            <span className="text-sm font-semibold text-gray-900">
              ${billingInterval === "annual" ? estimate.monthlyTotal * 12 : estimate.monthlyTotal}
              {billingInterval === "annual" ? "/yr" : "/mo"}
            </span>
          </div>

          <button
            onClick={handleUpgrade}
            disabled={upgrading}
            className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {upgrading ? "Redirecting to Stripe…" : "Add payment method"}
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">
            Secured by Stripe. Cancel anytime.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-gray-900">Manage subscription</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Update payment method, view invoices, or cancel
              </p>
            </div>
            <button
              onClick={handlePortal}
              disabled={upgrading}
              className="px-4 py-2 text-sm border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {upgrading ? "Opening…" : "Manage billing"}
            </button>
          </div>
        </div>
      )}

      {/* Pricing reference */}
      <div className="text-xs text-gray-400 space-y-1">
        <p>Minimum 5 billed leadership seats per workspace.</p>
        <p>IC (Team Member) seats are always free.</p>
        <p>Annual billing: ~20% discount, billed upfront.</p>
      </div>
    </div>
  );
}
