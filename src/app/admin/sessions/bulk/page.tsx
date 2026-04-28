'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { generateSchedule, DEFAULT_CURRICULUM } from '@/lib/curriculum';
import { getCourses, createSession } from '@/lib/mockData';
import { formatDate } from '@/lib/utils';

export default function BulkSchedulePage() {
  const router = useRouter();
  const courses = getCourses();
  
  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const [startDate, setStartDate] = useState('');
  const [skippedWeeks, setSkippedWeeks] = useState<number[]>([]);
  const [previewSchedule, setPreviewSchedule] = useState<any[]>([]);

  // Update preview when inputs change
  useEffect(() => {
    if (startDate) {
      const date = new Date(startDate);
      // Ensure it's a Saturday (day 6)
      if (date.getDay() !== 6) {
        // We could auto-adjust or just warn. Let's auto-adjust to the nearest Saturday.
        const diff = 6 - date.getDay();
        date.setDate(date.getDate() + diff);
      }
      const schedule = generateSchedule(date, skippedWeeks);
      setPreviewSchedule(schedule);
    }
  }, [startDate, skippedWeeks]);

  const toggleWeek = (week: number) => {
    setSkippedWeeks(prev => 
      prev.includes(week) ? prev.filter(w => w !== week) : [...prev, week]
    );
  };

  const handleGenerate = () => {
    if (!courseId || previewSchedule.length === 0) return;

    previewSchedule.forEach((item, index) => {
      createSession({
        course_id: courseId,
        title: item.title,
        session_number: index + 1,
        session_date: item.date,
        is_published: true,
      });
    });

    router.push('/admin/sessions');
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Bulk Schedule Setup</h1>
          <p className="admin-page-subtitle">Generate an 8-week curriculum based on a start date</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="form-group">
            <label className="form-label">Target Course</label>
            <select 
              className="form-input"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Batch Start Date (Saturday)</label>
            <input 
              type="date" 
              className="form-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              The schedule will automatically align to the Saturday of this week.
            </p>
          </div>
        </div>

        <div style={{ marginTop: '24px' }}>
          <label className="form-label">Exclude Specific Weekends?</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(w => (
              <button
                key={w}
                type="button"
                className={`btn btn-sm ${skippedWeeks.includes(w) ? 'btn-danger' : 'btn-ghost'}`}
                onClick={() => toggleWeek(w)}
                style={{ minWidth: '80px' }}
              >
                Week {w} {skippedWeeks.includes(w) ? ' (Skip)' : ''}
              </button>
            ))}
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
            Skipping a week will push all subsequent sessions by 7 days.
          </p>
        </div>
      </div>

      {previewSchedule.length > 0 && (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Week</th>
                <th>Day</th>
                <th>Category</th>
                <th>Session Title</th>
                <th>Scheduled Date</th>
              </tr>
            </thead>
            <tbody>
              {previewSchedule.map((item, idx) => (
                <tr key={idx}>
                  <td>W{item.week}</td>
                  <td>{item.day}</td>
                  <td>
                    <span className={`badge badge-${item.category.toLowerCase().replace(' ', '-')}`}>
                      {item.category}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{item.title}</td>
                  <td style={{ color: 'var(--accent-primary)' }}>{formatDate(item.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '32px', display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={() => router.back()}>Cancel</button>
        <button 
          className="btn btn-primary" 
          disabled={!startDate || !courseId}
          onClick={handleGenerate}
        >
          Confirm & Generate 16 Sessions
        </button>
      </div>

      <style jsx>{`
        .badge-orientation { background: rgba(147, 51, 234, 0.2); color: #a855f7; border: 1px solid rgba(147, 51, 234, 0.3); }
        .badge-quants { background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
        .badge-verbal { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
        .badge-data-insights { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
      `}</style>
    </div>
  );
}
