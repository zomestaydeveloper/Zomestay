import { CalendarDays } from "lucide-react"; // npm i lucide-react
import StatCard from "../../components/Admin/StatCard";
import { ShoppingBasket, Clock8, RotateCw } from "lucide-react";
import EarningRevenueCard from "../../components/Admin/EarningRevenueCard";


const HostDashboard  =()=>{
    return(
        <div className=" ">

           <div className="flex flex-col md:flex-row justify-between gap-4 px-6 py-4">
      <h1 className="text-blue-900 text-[18px] font-bold">Sales Dashboard</h1>

      <div className="relative w-[220px]">
        {/* Calendar icon */}
        <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 w-5 h-5" />

        {/* Actual date input */}
        <input
          type="date"
          required
          className="
            peer w-full pl-10 pr-3 py-2
            text-sm text-gray-400
            border border-gray-300  rounded-md 
            focus:outline-none focus:ring-2 focus:ring-blue-400
            [color-scheme:light]
          "
        />

        {/* Fake placeholder (shown when no value) */}
        
      </div>
    </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <StatCard
        title="Total Revenue"
        value="3257"
        delta={-43.2}
        tone="green"
        barPct={75}
        icon={<ShoppingBasket className="h-7 w-7 text-emerald-500" />}
      />

      <StatCard
        title="Total Bookings"
        value="165"
        delta={19.8}
        tone="rose"
        barPct={55}
        icon={<Clock8 className="h-7 w- text-rose-500" />}
      />

      <StatCard
        title="Total Enquiry"
        value="168"
        delta={0.8}
        tone="indigo"
        barPct={60}
        icon={<RotateCw className="h-7 w-7 text-indigo-600" />}
      />
    </div>
         <div className="mt-6">
        <EarningRevenueCard />
      </div>
         <div></div>


        </div>
    )
}
 export default HostDashboard