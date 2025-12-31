import React from "react";

const PricingSummary = ({ pricingSummary }) => {
  if (!pricingSummary || pricingSummary.error) return null;

  return (
    <div className="space-y-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs text-emerald-700">
      <div className="flex items-center justify-between text-sm font-semibold text-emerald-800">
        <span>Total for {pricingSummary.nights} night(s)</span>
        <span>₹{pricingSummary.total.toLocaleString("en-IN")}</span>
      </div>
      {pricingSummary.totalBasePrice && (
        <div className="flex items-center justify-between border-t border-emerald-200 pt-2">
          <span>Base Price:</span>
          <span>₹{pricingSummary.totalBasePrice.toLocaleString("en-IN")}</span>
        </div>
      )}
      {pricingSummary.totalTax && (
        <div className="flex items-center justify-between">
          <span>Tax ({pricingSummary.totalBasePrice && pricingSummary.totalBasePrice <= 7500 ? '5%' : '18%'}):</span>
          <span>₹{pricingSummary.totalTax.toLocaleString("en-IN")}</span>
        </div>
      )}
      {pricingSummary.perRoomBreakdown.map((roomBreakdown) => (
        <div
          key={`room-breakdown-${roomBreakdown.roomIndex}`}
          className="rounded border border-emerald-100 bg-white px-3 py-2 text-[11px] text-emerald-700"
        >
          <div className="font-semibold">
            Room {roomBreakdown.roomIndex}: ₹
            {roomBreakdown.totalWithTax?.toLocaleString("en-IN") || roomBreakdown.total.toLocaleString("en-IN")}
          </div>
          <div>
            Base: ₹{roomBreakdown.total.toLocaleString("en-IN")}
            {roomBreakdown.tax && (
              <> • Tax ({roomBreakdown.total <= 7500 ? '5%' : '18%'}): ₹{roomBreakdown.tax.toLocaleString("en-IN")}</>
            )}
          </div>
          <div>
            Base guests per room: {roomBreakdown.baseGuests ?? roomBreakdown.baseCount} • Base per night: ₹
            {roomBreakdown.basePerNight.toLocaleString("en-IN")}
          </div>
          {roomBreakdown.extras.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {roomBreakdown.extras.map((extra, index) => (
                <div key={`extra-${roomBreakdown.roomIndex}-${index}`}>
                  Extra ({extra.type}
                  {extra.count && extra.count > 1 ? ` × ${extra.count}` : ""}): ₹
                  {(extra.perNight * (extra.count || 1)).toLocaleString("en-IN")} per night
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default PricingSummary;


