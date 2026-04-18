import React from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../../api';
import { formatCurrency, formatWhatsAppNumber } from '../../utils/formatters';

const StudentCard = ({ student, todayStatus, getTodayAttendance, getStatusBadge, handleViewFees, getStudentMiscFees, currentTerm }) => {
  const currentTermFeeRecord = student.feeRecords?.find(
    fee => fee.term?.isCurrent && fee.academicSession?.isCurrent
  );
  const latestFeeRecord = currentTermFeeRecord || student.feeRecords?.[0];
  const hasFeeInfo = latestFeeRecord != null;

  return (
    <div className="group flex flex-col bg-white rounded-[32px] overflow-hidden shadow-xl border border-slate-100 hover:shadow-2xl transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
      {/* Ward Header */}
      <div className="relative p-6 bg-gradient-to-br from-slate-50 to-white border-b border-slate-100">
        <div className="absolute top-0 right-0 p-4">
          {todayStatus?.isHoliday ? (
            <div className="px-3 py-1.5 rounded-2xl bg-blue-50/80 backdrop-blur-sm border border-blue-100 text-[9px] font-black uppercase tracking-widest text-blue-600 flex flex-col items-center">
              <span className="opacity-50 text-[7px] mb-0.5 leading-none">Status</span>
              {todayStatus.type === 'weekend' ? 'Weekend' : 'Holiday'}
            </div>
          ) : getTodayAttendance(student) ? (
            <div className={`px-3 py-1.5 rounded-2xl border backdrop-blur-sm text-[9px] font-black uppercase tracking-widest flex flex-col items-center ${getStatusBadge(getTodayAttendance(student).status)}`}>
              <span className="opacity-50 text-[7px] mb-0.5 leading-none">Today</span>
              {getTodayAttendance(student).status}
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-2xl bg-slate-100/80 border border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-400 flex flex-col items-center">
              <span className="opacity-50 text-[7px] mb-0.5 leading-none">Attendance</span>
              Pending
            </div>
          )}
        </div>

        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-[28px] bg-primary p-1 shadow-2xl transition-transform group-hover:rotate-3 duration-500">
              <div className="w-full h-full rounded-[24px] bg-slate-100 overflow-hidden flex items-center justify-center border-4 border-white">
                {(() => {
                  const photoUrl = student.user?.photoUrl || student.photoUrl;
                  return photoUrl ? (
                    <img
                      src={photoUrl.startsWith('data:') || photoUrl.startsWith('http') ? photoUrl : `${API_BASE_URL}${photoUrl}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-black text-primary">{student.user?.firstName?.[0]}{student.user?.lastName?.[0]}</span>
                  );
                })()}
              </div>
            </div>
            <div className="absolute -bottom-2 -right-2 h-8 w-8 bg-emerald-500 rounded-full border-4 border-white flex items-center justify-center text-white shadow-lg animate-bounce">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          <div className="min-w-0 pr-16">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-1 truncate">
              {student.user?.firstName} {student.user?.lastName}
            </h3>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-md">
                {student.classModel?.name} {student.classModel?.arm}
              </span>
            </div>
            <div className="flex flex-col gap-1 mt-1 text-[10px] font-bold uppercase tracking-[0.15em]">
              <div className="flex items-center gap-1.5 text-slate-400">
                <span>REG:</span>
                <span className="text-slate-800">{student.admissionNumber}</span>
              </div>
              {(student.parentPhone || student.parentGuardianPhone) && (
                <div className="flex items-center gap-1.5 text-slate-400">
                  <span>PARENT PH:</span>
                  <span className="text-slate-800">{student.parentPhone || student.parentGuardianPhone}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-6 flex-1 bg-white">
        {/* Financial Ledger Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Fee Dashboard
            </h4>
            {currentTermFeeRecord && <span className="text-[8px] font-black px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full tracking-widest">CURRENT TERM</span>}
          </div>

          {hasFeeInfo ? (
            <div className="grid grid-cols-1 gap-3">
              <div className="relative p-4 rounded-3xl bg-slate-50 border border-slate-100 overflow-hidden group/fee transition-all hover:bg-slate-100">
                <div className="flex justify-between items-center relative z-10">
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Outstanding</p>
                    <p className={`text-2xl font-black italic tracking-tighter ${latestFeeRecord.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {formatCurrency(latestFeeRecord.balance)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${
                      latestFeeRecord.balance === 0 ? 'bg-emerald-500 text-white' : 
                      latestFeeRecord.paidAmount > 0 ? 'bg-amber-500 text-white' : 'bg-red-600 text-white'
                    }`}>
                      {latestFeeRecord.balance === 0 ? 'Settled' : latestFeeRecord.paidAmount > 0 ? 'Partial' : 'Debt'}
                    </div>
                  </div>
                </div>
                <div className="mt-4 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 bg-emerald-500`}
                    style={{ width: `${Math.min(100, (latestFeeRecord.paidAmount / latestFeeRecord.expectedAmount) * 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-1">
                <div className="p-3 rounded-2xl bg-white border border-slate-100 shadow-sm">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Total Fee</p>
                  <p className="font-bold text-slate-900 tracking-tight">{formatCurrency(latestFeeRecord.expectedAmount)}</p>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100 shadow-sm">
                  <p className="text-[8px] font-black text-emerald-600 uppercase mb-1">Paid to Date</p>
                  <p className="font-bold text-emerald-700 tracking-tight">{formatCurrency(latestFeeRecord.paidAmount)}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <p className="text-xs text-slate-400 font-black uppercase tracking-[0.2em]">No Financial Records</p>
            </div>
          )}

          {(() => {
            const studentMiscFees = getStudentMiscFees(student);
            if (studentMiscFees.length === 0) return null;
            
            const totalExpected = studentMiscFees.reduce((sum, f) => sum + f.amount, 0);
            const totalPaid = studentMiscFees.reduce((sum, f) => sum + (f.paid || 0), 0);
            const balance = totalExpected - totalPaid;
            
            if (totalExpected === 0) return null;

            return (
              <div className="p-5 bg-slate-900 rounded-[28px] shadow-2xl relative overflow-hidden group/misc">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover/misc:bg-primary/20 transition-all"></div>
                
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="text-[9px] font-black text-primary flex items-center gap-2 uppercase tracking-[0.25em]">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                      Ancillary Services
                    </h4>
                    <div className="flex flex-wrap gap-1 max-w-[50%] justify-end">
                      {studentMiscFees.slice(0, 2).map(f => (
                        <span key={f.id} className="text-[7px] px-2 py-0.5 bg-white/5 text-white/50 rounded-full border border-white/5 font-black uppercase italic truncate">
                          {f.title}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white/5 p-2 rounded-2xl text-center">
                      <p className="text-[7px] font-black text-slate-500 uppercase mb-0.5">Billed</p>
                      <p className="text-xs font-bold text-white tracking-tighter italic">₦{totalExpected.toLocaleString()}</p>
                    </div>
                    <div className="bg-white/5 p-2 rounded-2xl text-center">
                      <p className="text-[7px] font-black text-slate-500 uppercase mb-0.5">Cleared</p>
                      <p className="text-xs font-bold text-emerald-400 tracking-tighter italic">₦{totalPaid.toLocaleString()}</p>
                    </div>
                    <div className={`p-2 rounded-2xl border transition-all text-center ${balance > 0 ? 'bg-primary/10 border-primary/20' : 'bg-white/5 border-white/5'}`}>
                      <p className={`text-[7px] font-black uppercase mb-0.5 ${balance > 0 ? 'text-primary' : 'text-slate-500'}`}>Balance</p>
                      <p className={`text-xs font-bold tracking-tighter italic ${balance > 0 ? 'text-white' : 'text-slate-400'}`}>₦{balance.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        <div className="grid grid-cols-1 gap-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            {hasFeeInfo && (
              <button
                onClick={() => handleViewFees(student)}
                className="group/btn flex-1 flex items-center justify-center gap-2 py-4 px-4 bg-teal-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg hover:bg-teal-700 active:scale-95 transition-all"
              >
                <svg className="w-4 h-4 transition-transform group-hover/btn:scale-125" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Payments
              </button>
            )}
            <Link
              to={`/dashboard/parent/attendance?studentId=${student.id}&view=parent`}
              className="group/btn flex-1 flex items-center justify-center gap-2 py-4 px-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg hover:bg-blue-700 active:scale-95 transition-all"
            >
              <svg className="w-4 h-4 transition-transform group-hover/btn:scale-125" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Calendar
            </Link>
          </div>

          <div className="flex gap-3">
            <Link
              to={`/dashboard/term-report?studentId=${student.id}&view=parent`}
              className="flex-1 flex flex-col items-center justify-center py-4 bg-slate-900 text-white rounded-[24px] text-[9px] font-black uppercase tracking-widest shadow-xl border border-white/5 hover:bg-black transition-colors"
            >
              <span className="opacity-40 text-[7px] mb-1">Terminal</span>
              Report Card
            </Link>
            <Link
              to={`/dashboard/cumulative-report?studentId=${student.id}&view=parent`}
              className="flex-1 flex flex-col items-center justify-center py-4 bg-slate-800 text-white rounded-[24px] text-[9px] font-black uppercase tracking-widest shadow-xl border border-white/5 hover:bg-slate-900 transition-colors"
            >
              <span className="opacity-40 text-[7px] mb-1">Annual</span>
              Cumulative
            </Link>
          </div>

          <Link
            to={`/dashboard/parent/quran?studentId=${student.id}&view=parent`}
            className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-[24px] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:brightness-110 active:scale-[0.98] transition-all border border-white/10"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            View Qur'an Progress
          </Link>
        </div>

        <div className="flex gap-3">
          <Link
            to="/dashboard/parent/messages?view=parent"
            className="flex-1 flex items-center justify-center gap-2 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:brightness-110 transition-all active:scale-95"
          >
            Support Center
          </Link>
          <Link
            to={`/dashboard/analytics?studentId=${student.id}&view=parent`}
            className="flex-1 flex items-center justify-center gap-2 py-4 bg-orange-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-orange-600 transition-all active:scale-95"
          >
            Performance
          </Link>
        </div>

        {student.classModel?.classTeacher && (
          <div className="mt-2 p-5 bg-emerald-50/30 rounded-[28px] border border-emerald-100/50 flex items-center gap-4 transition-all hover:bg-emerald-50 group/master">
            <div className="h-12 w-12 rounded-2xl bg-white border-2 border-emerald-100 flex items-center justify-center font-black text-emerald-600 shadow-sm overflow-hidden group-hover/master:border-emerald-500 transition-all">
              {student.classModel.classTeacher.photoUrl ? (
                <img 
                  src={student.classModel.classTeacher.photoUrl.startsWith('data:') || student.classModel.classTeacher.photoUrl.startsWith('http') ? student.classModel.classTeacher.photoUrl : `${API_BASE_URL}${student.classModel.classTeacher.photoUrl}`}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{student.classModel.classTeacher.firstName?.[0]}{student.classModel.classTeacher.lastName?.[0]}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[8px] font-black uppercase text-emerald-600 tracking-[0.2em] mb-0.5">Form Master</p>
              <p className="text-sm font-black text-slate-900 truncate">
                {student.classModel.classTeacher.firstName} {student.classModel.classTeacher.lastName}
              </p>
            </div>
            <div className="flex gap-2">
              {(student.classModel.classTeacher.teacher?.publicPhone || student.classModel.classTeacher.teacher?.phone) && (
                <a 
                  href={`tel:${student.classModel.classTeacher.teacher?.publicPhone || student.classModel.classTeacher.teacher?.phone}`}
                  className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center border border-emerald-100 shadow-sm hover:scale-110 active:scale-95 transition-all text-emerald-600 hover:bg-emerald-600 hover:text-white"
                  title="Call Form Master"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </a>
              )}
              {(student.classModel.classTeacher.teacher?.publicWhatsapp || student.classModel.classTeacher.teacher?.publicPhone) && (
                <a 
                  href={`https://wa.me/${formatWhatsAppNumber(student.classModel.classTeacher.teacher?.publicWhatsapp || student.classModel.classTeacher.teacher?.publicPhone || student.classModel.classTeacher.username)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:scale-110 active:scale-95 transition-all text-white"
                  title="WhatsApp Form Master"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-4.431 6.516a10.024 10.024 0 01-5.115-1.411l-.367-.218-3.801 1.002.112-3.8-.231-.368A9.994 9.994 0 012.83 10.155c0-5.518 4.482-10 10-10 5.518 0 10 4.482 10 10 0 5.519-4.482 10-10 10z" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentCard;
