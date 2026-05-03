'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { MaterialType } from '@/lib/types';
import { getMaterialTypeIcon, getMaterialTypeLabel } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';

export default function EditSessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  
  const supabase = createClient();
  const { addToast } = useAuth();

  const [courses, setCourses] = useState<any[]>([]);
  const [courseName, setCourseName] = useState('');
  const [form, setForm] = useState({
    title: '',
    session_number: '',
    session_date: '',
    course_id: '',
    is_published: true,
  });
  
  const [materials, setMaterialsList] = useState<any[]>([]);
  const [practiceSet, setPracticeSet] = useState<any | null>(null);
  const [practiceQuestions, setPracticeQuestions] = useState<any[]>([]);
  const [practiceUnavailable, setPracticeUnavailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  
  const [isUploading, setIsUploading] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    type: 'pre_read' as MaterialType,
    title: '',
    file_url: '',
    notion_url: '',
    video_url: '',
  });
  const [newQuestion, setNewQuestion] = useState({
    question_text: '',
    optionsText: '',
    correct_answer: '',
    explanation: '',
  });

  const fetchData = async () => {
    setIsLoading(true);
    
    const [
      { data: session },
      { data: materialsData },
      { data: coursesData }
    ] = await Promise.all([
      supabase.from('sessions').select('*, courses(name)').eq('id', sessionId).single(),
      supabase.from('materials').select('*').eq('session_id', sessionId).order('created_at', { ascending: true }),
      supabase.from('courses').select('id, name')
    ]);

    if (session) {
      // Convert session_date to local datetime-local format
      const dt = new Date(session.session_date);
      const localDt = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      
      setForm({
        title: session.title,
        session_number: String(session.session_number),
        session_date: localDt,
        course_id: session.course_id,
        is_published: session.is_published,
      });
      setCourseName(session.courses?.name || '');
    }

    if (materialsData) setMaterialsList(materialsData);
    if (coursesData) setCourses(coursesData);

    try {
      const { data: sets, error: setError } = await supabase
        .from('practice_sets')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(1);

      if (setError) throw setError;

      const firstSet = sets?.[0] || null;
      setPracticeSet(firstSet);

      if (firstSet) {
        const { data: questions, error: questionsError } = await supabase
          .from('practice_questions')
          .select('*')
          .eq('practice_set_id', firstSet.id)
          .order('order_index', { ascending: true });

        if (questionsError) throw questionsError;
        setPracticeQuestions(questions || []);
      } else {
        setPracticeQuestions([]);
      }
      setPracticeUnavailable(false);
    } catch (practiceError) {
      console.info('Practice tables are not available yet.', practiceError);
      setPracticeUnavailable(true);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    if (sessionId) fetchData();
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { uploadFile } = await import('@/utils/supabase/storage');
      const publicUrl = await uploadFile(file);
      
      if (newMaterial.type === 'video') {
        setNewMaterial({ ...newMaterial, video_url: publicUrl, title: newMaterial.title || file.name });
      } else {
        setNewMaterial({ ...newMaterial, file_url: publicUrl, title: newMaterial.title || file.name });
      }
      addToast('success', 'File uploaded successfully.');
    } catch (err: any) {
      addToast('error', 'Upload failed: ' + err.message);
    }
    setIsUploading(false);
  };

  const handleUpdateSession = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from('sessions')
      .update({
        title: form.title,
        session_number: Number(form.session_number),
        session_date: new Date(form.session_date).toISOString(),
        course_id: form.course_id,
        is_published: form.is_published,
      })
      .eq('id', sessionId);

    if (error) {
      addToast('error', 'Failed to update session.');
      console.error(error);
    } else {
      addToast('success', 'Session updated.');
      const selectedCourse = courses.find((course) => course.id === form.course_id);
      if (selectedCourse) setCourseName(selectedCourse.name);
    }

    setSaving(false);
  };

  const handleAddMaterial = async () => {
    if (!newMaterial.title) return;

    // Calculate a valid available_from date based on session date to satisfy the DB constraint
    const sessionDateObj = new Date(form.session_date);
    let calculatedDate = new Date(sessionDateObj);
    if (newMaterial.type === 'pre_read') {
      calculatedDate = new Date(calculatedDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      calculatedDate = new Date(calculatedDate.getTime() + 2 * 60 * 60 * 1000);
    }

    const { error } = await supabase.from('materials').insert({
      session_id: sessionId,
      type: newMaterial.type,
      title: newMaterial.title,
      file_url: newMaterial.file_url || null,
      notion_url: newMaterial.notion_url || null,
      video_url: newMaterial.video_url || null,
      available_from: calculatedDate.toISOString() // Hidden from UI but required by schema
    });

    if (error) {
      addToast('error', 'Failed to add material.');
      console.error(error);
    } else {
      addToast('success', 'Material added.');
      setNewMaterial({
        type: 'pre_read',
        title: '',
        file_url: '',
        notion_url: '',
        video_url: '',
      });
      setShowAddMaterial(false);
      fetchData(); // refresh materials list
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    const { error } = await supabase.from('materials').delete().eq('id', id);
    if (error) {
      addToast('error', 'Failed to delete material.');
    } else {
      addToast('success', 'Material deleted.');
      fetchData();
    }
  };

  const ensurePracticeSet = async () => {
    if (practiceSet) return practiceSet;

    const { data, error } = await supabase
      .from('practice_sets')
      .insert({
        session_id: sessionId,
        title: `${form.title || 'Session'} Practice`,
      })
      .select()
      .single();

    if (error) throw error;
    setPracticeSet(data);
    return data;
  };

  const handleAddPracticeQuestion = async () => {
    const options = newQuestion.optionsText
      .split('\n')
      .map((option) => option.trim())
      .filter(Boolean);

    if (!newQuestion.question_text.trim() || options.length < 2 || !newQuestion.correct_answer.trim()) {
      addToast('error', 'Add a prompt, at least two options, and the correct answer.');
      return;
    }

    if (!options.includes(newQuestion.correct_answer.trim())) {
      addToast('error', 'Correct answer must exactly match one option.');
      return;
    }

    try {
      const set = await ensurePracticeSet();
      const { error } = await supabase.from('practice_questions').insert({
        practice_set_id: set.id,
        question_text: newQuestion.question_text.trim(),
        options,
        correct_answer: newQuestion.correct_answer.trim(),
        explanation: newQuestion.explanation.trim(),
        order_index: practiceQuestions.length + 1,
      });

      if (error) throw error;

      addToast('success', 'Practice question added.');
      setNewQuestion({
        question_text: '',
        optionsText: '',
        correct_answer: '',
        explanation: '',
      });
      setShowAddQuestion(false);
      fetchData();
    } catch (err) {
      console.error(err);
      addToast('error', 'Failed to add practice question.');
    }
  };

  const handleDeletePracticeQuestion = async (id: string) => {
    const { error } = await supabase.from('practice_questions').delete().eq('id', id);
    if (error) {
      addToast('error', 'Failed to delete practice question.');
    } else {
      addToast('success', 'Practice question deleted.');
      fetchData();
    }
  };

  if (isLoading) {
    return (
      <div className="admin-loading">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{form.title}</h1>
          <p className="admin-page-subtitle">Batch: {courseName || 'Loading...'}</p>
        </div>
        <button className="btn btn-ghost" onClick={() => router.push('/admin/sessions')}>
          ← Back to Schedule
        </button>
      </div>

      {/* Session Details Form */}
      <div className="admin-card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="admin-card-header">
          <h2 className="admin-card-title">Session Details</h2>
        </div>
        <form onSubmit={handleUpdateSession} className="admin-form">
          <div className="form-group">
            <label htmlFor="edit-title" className="form-label">Session Title</label>
            <input
              id="edit-title"
              type="text"
              className="form-input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          <div className="admin-form-row">
            <div className="form-group">
              <label htmlFor="edit-number" className="form-label">Session Number</label>
              <input
                id="edit-number"
                type="number"
                className="form-input"
                min="1"
                value={form.session_number}
                onChange={(e) => setForm({ ...form, session_number: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="edit-date" className="form-label">Session Date</label>
              <input
                id="edit-date"
                type="datetime-local"
                className="form-input"
                value={form.session_date}
                onChange={(e) => setForm({ ...form, session_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="edit-course" className="form-label">Batch</label>
            <select
              id="edit-course"
              className="form-select"
              value={form.course_id}
              onChange={(e) => setForm({ ...form, course_id: e.target.value })}
            >
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: 'var(--accent-primary)' }}
              />
              Published
            </label>
          </div>

          <div className="admin-form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><div className="spinner" /> Saving...</> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Materials Section */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">Materials ({materials.length})</h2>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowAddMaterial(!showAddMaterial)}
          >
            {showAddMaterial ? '✕ Cancel' : '+ Add Material'}
          </button>
        </div>

        {/* Add Material Form */}
        {showAddMaterial && (
          <div style={{
            padding: 'var(--space-xl)',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-secondary)',
            marginBottom: 'var(--space-lg)',
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>Add New Material</h3>
            <div className="admin-form">
              <div className="admin-form-row">
                <div className="form-group">
                  <label htmlFor="mat-type" className="form-label">Type</label>
                  <select
                    id="mat-type"
                    className="form-select"
                    value={newMaterial.type}
                    onChange={(e) => setNewMaterial({ ...newMaterial, type: e.target.value as MaterialType })}
                  >
                    <option value="pre_read">📖 Pre-read</option>
                    <option value="class_material">📄 Class Material</option>
                    <option value="worksheet">✍️ Worksheet</option>
                    <option value="video">🎬 Video</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="mat-title" className="form-label">Title</label>
                  <input
                    id="mat-title"
                    type="text"
                    className="form-input"
                    placeholder="Material title"
                    value={newMaterial.title}
                    onChange={(e) => setNewMaterial({ ...newMaterial, title: e.target.value })}
                  />
                </div>
              </div>

              {(newMaterial.type === 'class_material' || newMaterial.type === 'worksheet' || newMaterial.type === 'video') && (
                <div className="form-group">
                  <label htmlFor="mat-upload" className="form-label">
                    {newMaterial.type === 'video' ? 'Upload Video' : 'Upload PDF'}
                  </label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                      id="mat-upload"
                      type="file"
                      className="form-input"
                      accept={newMaterial.type === 'video' ? 'video/*' : 'application/pdf'}
                      onChange={handleFileUpload}
                    />
                    {isUploading && <div className="spinner" />}
                  </div>
                  {newMaterial.file_url || newMaterial.video_url ? (
                    <div style={{ fontSize: '11px', color: 'var(--accent-primary)', marginTop: '4px' }}>
                      ✓ File uploaded and ready.
                    </div>
                  ) : (
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                      Or paste a URL below if already hosted elsewhere.
                    </div>
                  )}
                </div>
              )}

              {newMaterial.type === 'pre_read' && (
                <div className="form-group">
                  <label htmlFor="mat-notion" className="form-label">Notion URL</label>
                  <input
                    id="mat-notion"
                    type="url"
                    className="form-input"
                    placeholder="https://notion.so/..."
                    value={newMaterial.notion_url}
                    onChange={(e) => setNewMaterial({ ...newMaterial, notion_url: e.target.value })}
                  />
                </div>
              )}

              {(newMaterial.type === 'class_material' || newMaterial.type === 'worksheet') && (
                <div className="form-group">
                  <label htmlFor="mat-file" className="form-label">File URL (PDF)</label>
                  <input
                    id="mat-file"
                    type="url"
                    className="form-input"
                    placeholder="https://..."
                    value={newMaterial.file_url}
                    onChange={(e) => setNewMaterial({ ...newMaterial, file_url: e.target.value })}
                  />
                </div>
              )}

              {newMaterial.type === 'video' && (
                <div className="form-group">
                  <label htmlFor="mat-video" className="form-label">Video URL</label>
                  <input
                    id="mat-video"
                    type="url"
                    className="form-input"
                    placeholder="https://..."
                    value={newMaterial.video_url}
                    onChange={(e) => setNewMaterial({ ...newMaterial, video_url: e.target.value })}
                  />
                </div>
              )}

              <div className="admin-form-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleAddMaterial}
                  disabled={!newMaterial.title}
                >
                  Add Material
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Materials List */}
        {materials.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {materials.map((mat) => (
              <div
                key={mat.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '12px 16px',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-primary)',
                }}
              >
                <span style={{ fontSize: '20px' }}>{getMaterialTypeIcon(mat.type)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{mat.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    {getMaterialTypeLabel(mat.type)} 
                    {mat.type === 'pre_read' ? ' · Unlocks 1 week before session' : ' · Unlocks right after session'}
                  </div>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleDeleteMaterial(mat.id)}
                  style={{ color: 'var(--error)' }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state" style={{ padding: '32px' }}>
            <div className="empty-state-icon">📭</div>
            <p className="empty-state-text">No materials added yet. Click &quot;Add Material&quot; to get started.</p>
          </div>
        )}
      </div>

      {/* Practice Questions Section */}
      <div className="admin-card" style={{ marginTop: 'var(--space-xl)' }}>
        <div className="admin-card-header">
          <div>
            <h2 className="admin-card-title">Native Practice Questions ({practiceQuestions.length})</h2>
            <p className="admin-page-subtitle">These appear in the student Practice tab before the worksheet fallback.</p>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowAddQuestion(!showAddQuestion)}
            disabled={practiceUnavailable}
          >
            {showAddQuestion ? '✕ Cancel' : '+ Add Question'}
          </button>
        </div>

        {practiceUnavailable ? (
          <div className="empty-state" style={{ padding: '24px' }}>
            <p className="empty-state-text">Practice tables are not available in this database yet. Apply the schema update first.</p>
          </div>
        ) : (
          <>
            {showAddQuestion && (
              <div style={{
                padding: 'var(--space-xl)',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-secondary)',
                marginBottom: 'var(--space-lg)',
              }}>
                <div className="admin-form">
                  <div className="form-group">
                    <label htmlFor="practice-prompt" className="form-label">Question Prompt</label>
                    <textarea
                      id="practice-prompt"
                      className="form-textarea"
                      value={newQuestion.question_text}
                      onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
                      placeholder="What is 25% of 160?"
                    />
                  </div>
                  <div className="admin-form-row">
                    <div className="form-group">
                      <label htmlFor="practice-options" className="form-label">Options (one per line)</label>
                      <textarea
                        id="practice-options"
                        className="form-textarea"
                        value={newQuestion.optionsText}
                        onChange={(e) => setNewQuestion({ ...newQuestion, optionsText: e.target.value })}
                        placeholder={'20\n30\n40\n50'}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="practice-answer" className="form-label">Correct Answer</label>
                      <input
                        id="practice-answer"
                        className="form-input"
                        value={newQuestion.correct_answer}
                        onChange={(e) => setNewQuestion({ ...newQuestion, correct_answer: e.target.value })}
                        placeholder="40"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="practice-explanation" className="form-label">Explanation</label>
                    <textarea
                      id="practice-explanation"
                      className="form-textarea"
                      value={newQuestion.explanation}
                      onChange={(e) => setNewQuestion({ ...newQuestion, explanation: e.target.value })}
                      placeholder="25% is one fourth, and one fourth of 160 is 40."
                    />
                  </div>
                  <div className="admin-form-actions">
                    <button className="btn btn-primary btn-sm" onClick={handleAddPracticeQuestion}>
                      Add Question
                    </button>
                  </div>
                </div>
              </div>
            )}

            {practiceQuestions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {practiceQuestions.map((question, index) => (
                  <div
                    key={question.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '12px 16px',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-primary)',
                    }}
                  >
                    <span style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>{index + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{question.question_text}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                        Answer: {question.correct_answer}
                      </div>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleDeletePracticeQuestion(question.id)}
                      style={{ color: 'var(--error)' }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '32px' }}>
                <div className="empty-state-icon">✍️</div>
                <p className="empty-state-text">No native questions yet. Students will see the worksheet fallback.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
