import React from "react";
import { TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";

export const StatCard = ({
  title,
  value,
  trend,
  trendType = "success", // success, warning, neutral
  icon: Icon,
  variant = "white", // white, charcoal, vermilion
  badgeText
}) => {
  if (variant === "charcoal") {
    return (
      <div className="bg-charcoal text-white rounded-2xl p-5 border border-charcoal-light shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          {Icon && (
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <Icon className="w-5 h-5" />
            </div>
          )}
          {badgeText && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/90">
              {badgeText}
            </span>
          )}
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold tracking-tight">{value}</div>
          <div className="text-sm font-medium text-white/70 mt-1">{title}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-5 border border-border shadow-sm flex flex-col justify-between hover:border-gray-300 transition-all">
      <div className="flex items-center justify-between">
        {Icon && (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            trendType === "warning" ? "bg-amber-50 text-amber-600" :
            trendType === "danger" ? "bg-red-50 text-red-600" :
            "bg-emerald-50 text-emerald-600"
          }`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
        {(trend || badgeText) && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
            trendType === "warning" ? "bg-amber-50 text-amber-700 border border-amber-200/50" :
            trendType === "danger" ? "bg-red-50 text-red-700 border border-red-200/50" :
            "bg-emerald-50 text-emerald-700 border border-emerald-200/50"
          }`}>
            {trend && <ArrowUpRight className="w-3.5 h-3.5" />}
            <span>{trend || badgeText}</span>
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="text-2xl sm:text-3xl font-bold text-charcoal tracking-tight">{value}</div>
        <div className="text-sm font-medium text-secondary mt-1">{title}</div>
      </div>
    </div>
  );
};

export default StatCard;
