import React, { useEffect, useState } from 'react';
import { agentOperationsService } from '../../services';
import agentMediaService from '../../services/media/agentMediaService';
import NotificationModal from '../../components/NotificationModal';
import { Loader2, CheckCircle, X, Building2, Phone, Mail, FileText, MapPin, Award, TrendingUp, Upload, AlertCircle } from 'lucide-react';

const Agent_list = () => {  
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [reason, setReason] = useState('');
  const [pendingAction, setPendingAction] = useState(null); // { agentId, status }
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [notification, setNotification] = useState({ isOpen: false, type: 'success', title: '', message: '' });
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [verifyReason, setVerifyReason] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewReason, setViewReason] = useState('');
  const [certificateFile, setCertificateFile] = useState(null);

  const openNotify = (type, title, message) => setNotification({ isOpen: true, type, title, message });
  const closeNotify = () => setNotification(prev => ({ ...prev, isOpen: false }));

  useEffect(() => { fetchAgents(); }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const res = await agentOperationsService.getAllAgents();
      if (res.data?.success) setAgents(res.data.data);
      else openNotify('error', 'Error', res.data?.message || 'Failed to load agents');
    } catch (e) {
      openNotify('error', 'Error', 'Failed to load agents');
    } finally { setLoading(false); }
  };

  const openVerify = (agent) => {
    setSelectedAgent(agent);
    setVerifyReason('');
    setShowVerifyModal(true);
  };

  const applyStatus = async (agentId, status, reasonText) => {
    try {
      setUpdatingId(agentId);
      const res = await agentOperationsService.updateAgentStatus(agentId, status, reasonText);
      if (res.data?.success) {
        openNotify('success', 'Updated', 'Agent status updated');
        // Update local state
        setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status, rejectionReason: reasonText || null } : a));
      } else {
        openNotify('error', 'Error', res.data?.message || 'Failed to update status');
      }
    } catch (e) {
      openNotify('error', 'Error', 'Failed to update status');
    } finally { setUpdatingId(null); }
  };

  return (
    <div className="min-h-screen bg-white p-3">
      <div className="border border-gray-500 rounded p-3">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xs font-semibold text-gray-800">Travel Agents</h1>
          {loading && (
            <div className="flex items-center text-gray-600 text-xs">
              <Loader2 className="h-3 w-3 animate-spin mr-1" /> Loading...
            </div>
          )}
        </div>

        <div className="space-y-2">
          {agents.length === 0 ? (
            <div className="py-6 px-2 text-center text-gray-600 text-xs border border-gray-200 rounded-lg">
              No agents registered yet
            </div>
          ) : (
            agents.map(agent => (
              <div key={agent.id} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm hover:shadow transition">
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
                  <div className="sm:col-span-2 flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {(agent.name || '').split(' ').map(n=>n[0]).join('').slice(0,2) || 'AG'}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">{agent.name}</div>
                      <div className="text-xs text-gray-500 truncate">{agent.email}</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-700">{agent.phone || '-'}</div>
                  <div className="text-xs text-gray-700 truncate">{agent.agencyName || '-'}</div>
                  <div className="flex items-center justify-between sm:justify-end gap-2">
                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border-2 text-xs font-medium ${agent.status==='approved' ? 'border-green-200 text-green-700 bg-green-50' : agent.status==='suspended' ? 'border-amber-200 text-amber-700 bg-amber-50' : 'border-gray-200 text-gray-700 bg-gray-50'}`}>
                      <span className={`w-2 h-2 rounded-full ${agent.status==='approved' ? 'bg-green-500' : agent.status==='suspended' ? 'bg-amber-500' : 'bg-gray-400'}`}></span>
                      {agent.status}
                    </span>
                    {agent.status === 'approved' ? (
                      <button
                        onClick={() => { setSelectedAgent(agent); setViewReason(''); setShowViewModal(true); }}
                        className="px-3 py-1.5 rounded-lg border-2 border-gray-300 text-gray-700 text-xs hover:bg-gray-100"
                      >View</button>
                    ) : (
                      <button
                        onClick={() => openVerify(agent)}
                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
                        disabled={updatingId === agent.id}
                        title="Verify agent"
                      >Verify</button>
                    )}
                    <button
                      onClick={() => { setSelectedAgent(agent); setDeleteReason(''); setShowDeleteModal(true); }}
                      className="px-3 py-1.5 rounded-lg border-2 border-red-300 text-red-700 text-xs hover:bg-red-50"
                    >Delete</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Reason Modal */}
      {showReasonModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white border border-gray-500 rounded p-3 w-full max-w-sm">
            <h3 className="text-xs font-semibold text-gray-800 mb-2">Enter reason</h3>
            <textarea
              className="w-full border border-gray-500 rounded p-2 text-xs mb-2"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for this action"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowReasonModal(false)}
                className="px-2 py-1 border border-gray-500 rounded text-gray-800"
              >Cancel</button>
              <button
                onClick={async () => {
                  const { agentId, status } = pendingAction || {};
                  if (!agentId || !status) { setShowReasonModal(false); return; }
                  await applyStatus(agentId, status, reason);
                  setShowReasonModal(false);
                }}
                className="px-2 py-1 border border-gray-500 rounded text-gray-800 hover:bg-gray-100"
              >Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Agent Modal */}
      {showDeleteModal && selectedAgent && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3">
          <div className="bg-white border border-gray-200 rounded-lg p-3 w-full max-w-sm">
            <h3 className="text-xs font-semibold text-gray-900 mb-2">Delete Agent</h3>
            <p className="text-[12px] text-gray-600 mb-4">Are you sure you want to delete this agent? This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={()=> setShowDeleteModal(false)} className="px-2 py-1 border border-gray-300 rounded text-gray-800">Cancel</button>
              <button
                onClick={async ()=> {
                  try {
                    setUpdatingId(selectedAgent.id);
                    const res = await agentOperationsService.deleteAgent(selectedAgent.id);
                    if (res.data?.success) {
                      setAgents(prev => prev.filter(a => a.id !== selectedAgent.id));
                      openNotify('success', 'Deleted', 'Agent deleted successfully');
                    } else {
                      openNotify('error', 'Error', res.data?.message || 'Failed to delete');
                    }
                  } catch (e) {
                    openNotify('error', 'Error', 'Failed to delete');
                  } finally {
                    setUpdatingId(null);
                    setShowDeleteModal(false);
                  }
                }}
                className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
              >Delete</button>
            </div>
          </div>
        </div>
      )}

    {/* Verify Modal */}
    {showVerifyModal && selectedAgent && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowVerifyModal(false)} />
        <div className="relative w-full max-w-2xl bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col">
          <div className="relative bg-gradient-to-r from-blue-600 to-indigo-700 px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-sm text-white flex items-center justify-center text-xs sm:text-sm font-bold">
                  VA
                </div>
                <div>
                  <div className="text-base sm:text-lg font-semibold text-white">Verify Agent</div>
                  <div className="text-xs text-blue-100 hidden sm:block">Review and approve/reject</div>
                </div>
              </div>
              <button className="text-white/90 hover:text-white hover:bg-white/10 rounded-lg p-1.5 sm:p-2" onClick={() => setShowVerifyModal(false)}>
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-[12px]">
              <div>
                <div className="text-gray-500 mb-1 flex items-center gap-2"><Mail className="w-4 h-4 text-gray-600" /> Name</div>
                <div className="font-medium text-gray-900">{selectedAgent.name}</div>
              </div>
              <div>
                <div className="text-gray-500 mb-1 flex items-center gap-2"><Mail className="w-4 h-4 text-gray-600" /> Email</div>
                <div className="font-medium text-gray-900">{selectedAgent.email}</div>
              </div>
              <div>
                <div className="text-gray-500 mb-1 flex items-center gap-2"><Phone className="w-4 h-4 text-gray-600" /> Phone</div>
                <div className="font-medium text-gray-900">{selectedAgent.phone || '-'}</div>
              </div>
              <div>
                <div className="text-gray-500 mb-1 flex items-center gap-2"><Building2 className="w-4 h-4 text-gray-600" /> Agency</div>
                <div className="font-medium text-gray-900">{selectedAgent.agencyName || '-'}</div>
              </div>
              <div>
                <div className="text-gray-500 mb-1 flex items-center gap-2"><Award className="w-4 h-4 text-gray-600" /> License No.</div>
                <div className="font-medium text-gray-900">{selectedAgent.licenseNumber || '-'}</div>
              </div>
              <div>
                <div className="text-gray-500 mb-1 flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-600" /> Office Address</div>
                <div className="font-medium text-gray-900 break-words">{selectedAgent.officeAddress || '-'}</div>
              </div>
              <div>
                <div className="text-gray-500 mb-1">Status</div>
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-gray-200 text-gray-700 bg-gray-50 font-medium">
                  <div className="w-2 h-2 rounded-full bg-gray-400" />
                  {selectedAgent.status}
                </span>
              </div>
              <div>
                <div className="text-gray-500 mb-1 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-gray-600" /> Total Bookings</div>
                <div className="font-semibold text-gray-900">{selectedAgent.totalBookings ?? 0}</div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-200/50 text-[12px]">
              <div className="text-gray-700 mb-2 flex items-center gap-2"><FileText className="w-4 h-4 text-blue-600" /> IATA Certificate</div>
              {selectedAgent.iataCertificate ? (
                <a
                  href={agentMediaService.getMedia(selectedAgent.iataCertificate)}
                  target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-white border-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 font-medium shadow-sm"
                >View Certificate</a>
              ) : (
                <div className="text-xs sm:text-sm text-gray-600">Certificate not provided</div>
              )}
            </div>

            {selectedAgent.status !== 'suspended' && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-amber-200/50">
                <div className="flex items-start gap-2 sm:gap-3 mb-2">
                  <div className="p-1.5 sm:p-2 bg-white rounded-md sm:rounded-lg shadow-sm flex-shrink-0">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Rejection Reason</label>
                    <p className="text-xs text-gray-500 mb-2">Required if you want to reject this agent</p>
                  </div>
                </div>
                <textarea
                  className="w-full border-2 border-gray-200 rounded-lg p-2.5 sm:p-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  rows={3}
                  value={verifyReason}
                  onChange={(e) => setVerifyReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                />
              </div>
            )}
          </div>

          <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2 flex-shrink-0">
            <button onClick={() => setShowVerifyModal(false)} className="px-4 py-2 rounded-lg border-2 border-gray-300 text-gray-700 text-xs sm:text-sm font-medium hover:bg-gray-100">Cancel</button>
            <button
              onClick={async () => { await applyStatus(selectedAgent.id, 'approved'); setShowVerifyModal(false); }}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs sm:text-sm font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
              disabled={updatingId === selectedAgent.id}
            >Approve</button>
            {selectedAgent.status !== 'suspended' && (
              <button
                onClick={async () => { if (!verifyReason || verifyReason.trim().length === 0) return; await applyStatus(selectedAgent.id, 'rejected', verifyReason); setShowVerifyModal(false); }}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs sm:text-sm font-medium hover:from-red-600 hover:to-rose-700 disabled:opacity-50"
                disabled={updatingId === selectedAgent.id}
              >Reject</button>
            )}
          </div>
        </div>
      </div>
    )}

    {/* View (Approved) Modal */}
    {showViewModal && selectedAgent && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowViewModal(false)} />
        <div className="relative w-full max-w-2xl bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col">
          <div className="relative bg-gradient-to-r from-blue-600 to-indigo-700 px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-sm text-white flex items-center justify-center text-xs sm:text-sm font-bold">AD</div>
                <div>
                  <div className="text-base sm:text-lg font-semibold text-white">Agent Details</div>
                  <div className="text-xs text-blue-100 hidden sm:block">Complete profile information</div>
                </div>
              </div>
              <button className="text-white/90 hover:text-white hover:bg-white/10 rounded-lg p-1.5 sm:p-2" onClick={() => setShowViewModal(false)}>
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-[12px]">
              <div>
                <div className="text-gray-500 mb-1 flex items-center gap-2"><Mail className="w-4 h-4 text-gray-600" /> Name</div>
                <div className="font-medium text-gray-900">{selectedAgent.name}</div>
              </div>
              <div>
                <div className="text-gray-500 mb-1 flex items-center gap-2"><Mail className="w-4 h-4 text-gray-600" /> Email</div>
                <div className="font-medium text-gray-900">{selectedAgent.email}</div>
              </div>
              <div>
                <div className="text-gray-500 mb-1 flex items-center gap-2"><Phone className="w-4 h-4 text-gray-600" /> Phone</div>
                <div className="font-medium text-gray-900">{selectedAgent.phone || '-'}</div>
              </div>
              <div>
                <div className="text-gray-500 mb-1 flex items-center gap-2"><Building2 className="w-4 h-4 text-gray-600" /> Agency</div>
                <div className="font-medium text-gray-900">{selectedAgent.agencyName || '-'}</div>
              </div>
              <div>
                <div className="text-gray-500 mb-1 flex items-center gap-2"><Award className="w-4 h-4 text-gray-600" /> License No.</div>
                <div className="font-medium text-gray-900">{selectedAgent.licenseNumber || '-'}</div>
              </div>
              <div>
                <div className="text-gray-500 mb-1 flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-600" /> Office Address</div>
                <div className="font-medium text-gray-900 break-words">{selectedAgent.officeAddress || '-'}</div>
              </div>
              <div>
                <div className="text-gray-500 mb-1">Status</div>
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-green-200 text-green-700 bg-green-50 font-medium">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  {selectedAgent.status}
                </span>
              </div>
              <div>
                <div className="text-gray-500 mb-1 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-gray-600" /> Total Bookings</div>
                <div className="font-semibold text-gray-900">{selectedAgent.totalBookings ?? 0}</div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-200/50 text-[12px]">
              <div className="text-gray-700 mb-2 flex items-center gap-2"><FileText className="w-4 h-4 text-blue-600" /> IATA Certificate</div>
              {selectedAgent.iataCertificate ? (
                <a
                  href={agentMediaService.getMedia(selectedAgent.iataCertificate)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-white border-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 font-medium shadow-sm"
                >View Certificate</a>
              ) : (
                <div className="text-xs sm:text-sm text-gray-600">Certificate not provided</div>
              )}
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-amber-200/50">
              <div className="flex items-start gap-2 sm:gap-3 mb-2">
                <div className="p-1.5 sm:p-2 bg-white rounded-md sm:rounded-lg shadow-sm flex-shrink-0">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Suspension Reason</label>
                  <p className="text-xs text-gray-500 mb-2">Required if you want to suspend this agent</p>
                </div>
              </div>
              <textarea
                className="w-full border-2 border-gray-200 rounded-lg p-2.5 sm:p-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                rows={3}
                value={viewReason}
                onChange={(e) => setViewReason(e.target.value)}
                placeholder="Enter detailed reason for suspension..."
              />
              {selectedAgent.status === 'suspended' && selectedAgent.suspensionReason && (
                <div className="mt-2 text-[12px] text-gray-700">
                  <span className="font-medium">Last suspension reason: </span>
                  <span className="text-gray-800">{selectedAgent.suspensionReason}</span>
                </div>
              )}
            </div>
          </div>

          <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2 flex-shrink-0">
            <button onClick={() => setShowViewModal(false)} className="px-4 py-2 rounded-lg border-2 border-gray-300 text-gray-700 text-xs sm:text-sm font-medium hover:bg-gray-100">Close</button>
            <button
              onClick={async () => {
                if (!viewReason || viewReason.trim().length === 0) return;
                await applyStatus(selectedAgent.id, 'suspended', viewReason);
                setShowViewModal(false);
              }}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs sm:text-sm font-medium hover:from-amber-600 hover:to-orange-700 disabled:opacity-50"
              disabled={updatingId === selectedAgent.id}
            >Suspend</button>
          </div>
        </div>
      </div>
    )}

      <NotificationModal
        isOpen={notification.isOpen}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onClose={closeNotify}
      />
    </div>
  );
}

export default Agent_list;