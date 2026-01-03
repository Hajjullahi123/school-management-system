import React, { forwardRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { API_BASE_URL } from '../api';

const AlumniIDCard = forwardRef(({ alumni, schoolSettings }, ref) => {
  if (!alumni || !alumni.student || !alumni.student.user) return null;

  const { firstName, lastName } = alumni.student.user;
  const { alumniId, graduationYear, profilePicture } = alumni;
  const schoolName = schoolSettings?.schoolName || "School Management";
  const logoUrl = schoolSettings?.logoUrl;

  return (
    <div ref={ref} className="flex gap-4 p-4">
      {/* FRONT SIDE */}
      <div className="w-[350px] h-[220px] bg-white rounded-lg shadow-xl overflow-hidden relative border border-gray-200 print:shadow-none print:border">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent"></div>

        {/* Header */}
        <div className="bg-primary text-white p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center p-1">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <span className="text-primary font-bold text-xs">SM</span>
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold leading-tight">{schoolName}</h2>
              <p className="text-[10px] uppercase tracking-wider opacity-90">Alumni Association</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex gap-4">
          {/* Photo */}
          <div className="w-24 h-28 bg-gray-100 border-2 border-primary/20 rounded-md overflow-hidden flex-shrink-0">
            {profilePicture ? (
              <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 flex flex-col justify-between py-1">
            <div>
              <h3 className="text-lg font-bold text-gray-800 leading-tight">{firstName} {lastName}</h3>
              <p className="text-xs text-primary font-medium mt-1">Alumni ID: {alumniId || 'Pending'}</p>
              <p className="text-xs text-gray-600">Class of {graduationYear}</p>
            </div>

            <div className="flex justify-between items-end mt-2">
              <div className="text-[9px] text-gray-500">
                <p>Verified Member</p>
                <p>{new Date().getFullYear()}</p>
              </div>
              <div className="w-12 h-12">
                <QRCodeCanvas value={`ALUMNI:${alumniId || alumni.student.id}`} size={48} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Stripe */}
        <div className="h-2 bg-secondary w-full absolute bottom-0"></div>
      </div>

      {/* BACK SIDE */}
      <div className="w-[350px] h-[220px] bg-white rounded-lg shadow-xl overflow-hidden relative border border-gray-200 print:shadow-none print:border">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent"></div>

        {/* Header Stripe */}
        <div className="h-2 bg-secondary w-full"></div>

        {/* Content */}
        <div className="p-6 h-full flex flex-col justify-between">
          {/* Guidelines */}
          <div>
            <h3 className="text-sm font-bold text-primary mb-3">Alumni Card Guidelines</h3>
            <ul className="text-[10px] text-gray-700 space-y-1.5 leading-relaxed">
              <li>• This card is non-transferable</li>
              <li>• Valid for lifetime membership benefits</li>
              <li>• Present at alumni events and gatherings</li>
              <li>• Report lost/stolen cards immediately</li>
            </ul>
          </div>

          {/* Contact Information */}
          <div className="border-t border-gray-200 pt-3">
            <h4 className="text-[9px] font-bold text-gray-600 uppercase mb-1.5">Contact Us</h4>
            <div className="text-[9px] text-gray-600 space-y-0.5">
              <p>Email: alumni@{schoolName.toLowerCase().replace(/\s+/g, '')}.edu</p>
              <p>Web: www.{schoolName.toLowerCase().replace(/\s+/g, '')}.edu/alumni</p>
              <p className="text-[8px] text-gray-400 mt-2">
                If found, please return to school administration
              </p>
            </div>
          </div>

          {/* Logo Footer */}
          <div className="flex justify-center items-center mt-2">
            {logoUrl && (
              <img src={logoUrl} alt="Logo" className="h-8 opacity-20" />
            )}
          </div>
        </div>

        {/* Footer Stripe */}
        <div className="h-2 bg-primary w-full absolute bottom-0"></div>
      </div>
    </div>
  );
});

export default AlumniIDCard;
