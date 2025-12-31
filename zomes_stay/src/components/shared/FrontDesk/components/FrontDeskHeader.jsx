import React from "react";
import { ArrowLeft, ArrowRight, Calendar, RotateCcw } from "lucide-react";
import { formatDate } from "../utils/formatUtils";
import { addDays, startOfWeek } from "../utils/dateUtils";

const FrontDeskHeader = ({
  weekStart,
  rangeStart,
  rangeEnd,
  loading,
  onWeekStartChange,
  onRefresh,
  onTodayClick,
}) => {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:border-gray-300 hover:text-gray-800"
          onClick={onTodayClick}
          disabled={loading}
        >
          Today
        </button>
        <div className="flex rounded-md border border-gray-200">
          <button
            type="button"
            className="flex items-center justify-center border-r border-gray-200 p-2 text-gray-500 hover:text-gray-700"
            onClick={() => onWeekStartChange(addDays(weekStart, -7))}
            disabled={loading}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="flex items-center justify-center p-2 text-gray-500 hover:text-gray-700"
            onClick={() => onWeekStartChange(addDays(weekStart, 7))}
            disabled={loading}
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
          onClick={onRefresh}
          disabled={loading}
        >
          <RotateCcw className="h-4 w-4" />
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="flex items-center gap-3 text-sm text-gray-500">
        <Calendar className="h-4 w-4 text-blue-500" />
        <span className="font-medium text-gray-700">Week at a glance</span>
        <span>
          {formatDate(rangeStart, { dateStyle: "medium" })} -{" "}
          {formatDate(rangeEnd, { dateStyle: "medium" })}
        </span>
      </div>
    </header>
  );
};

export default FrontDeskHeader;

