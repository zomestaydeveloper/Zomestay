import React from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const DoubleMonthCalendar = ({ startDate, endDate, onChange }) => {
  return (
    <DatePicker
      selected={startDate}
      onChange={onChange}
      startDate={startDate}
      endDate={endDate}
      monthsShown={2}
      selectsRange
      inline
      minDate={new Date()}
      calendarClassName="custom-calendar"
    />
  );
};

export default DoubleMonthCalendar;
