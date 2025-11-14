import AllCallbackRequests from "../../components/CallbackRequests/AllCallbackRequests";

/**
 * Admin CallbackRequests Page
 * Shows all callback requests from all properties
 */
export default function CallbackRequests() {
  return <AllCallbackRequests isAdmin={true} title="Callback Requests Management" />;
}

