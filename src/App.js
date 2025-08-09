import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked'; // Ensure marked and highlight.js are installed or included via CDN
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css'; // You can choose a different theme

function App() {
  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem('notes');
    return saved ? JSON.parse(saved) : [];
  });

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('Medium'); // New state for priority
  const [dueDate, setDueDate] = useState('');
  const [color, setColor] = useState('');
  const [editId, setEditId] = useState(null);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTags, setFilterTags] = useState([]);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDueDate, setFilterDueDate] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [isAnimating, setIsAnimating] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [showSettings, setShowSettings] = useState(false);
  const [editorMode, setEditorMode] = useState('write');
  const [wordCount, setWordCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showMarkdownCheatSheet, setShowMarkdownCheatSheet] = useState(false);
  const [selectedNotesForBulkAction, setSelectedNotesForBulkAction] = useState([]);
  const [showArchivedNotes, setShowArchivedNotes] = useState(false);
  const [lastDeletedNote, setLastDeletedNote] = useState(null); // New state for undo functionality
  
  const editorRef = useRef(null);
  const recognitionRef = useRef(null);
  const contentInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('notes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) setTheme(savedTheme);
  }, []);

  useEffect(() => {
    if (marked && hljs) {
      marked.setOptions({
        highlight: function(code, lang) {
          if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(code, { language: lang }).value;
          } else {
            return hljs.highlightAuto(code).value;
          }
        },
        gfm: true,
        breaks: true,
      });
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (content) {
      setWordCount(content.trim().split(/\s+/).length);
    } else {
      setWordCount(0);
    }
  }, [content]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        setContent(prevContent => prevContent + finalTranscript);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const handleAdd = () => {
    if (!title.trim() && !content.trim()) return;

    const newNote = {
      id: Date.now(),
      title,
      content,
      tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      category: category.trim(),
      priority, // New field
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      color,
      createdAt: new Date().toISOString(),
      pinned: false,
      isArchived: false,
    };

    setIsAnimating(true);
    setNotes([...notes, newNote]);
    setTitle('');
    setContent('');
    setTags('');
    setCategory('');
    setPriority('Medium'); // Reset to default
    setDueDate('');
    setColor('');
    setSelectedNoteId(newNote.id);
    setEditorMode('write');

    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      const deletedNote = notes.find(note => note.id === id);
      setLastDeletedNote(deletedNote); // Store for undo
      setNotes(notes.filter(note => note.id !== id));
      if (selectedNoteId === id) setSelectedNoteId(null);
    }
  };
  
  const handleUndoDelete = () => {
    if (lastDeletedNote) {
      setNotes([...notes, lastDeletedNote]);
      setLastDeletedNote(null);
      alert('Note restored successfully!');
    }
  };
  
  const handleArchive = (id) => {
    const archivedNote = notes.find(note => note.id === id);
    setLastDeletedNote(archivedNote); // Store for undo
    setNotes(notes.map(note =>
      note.id === id ? { ...note, isArchived: true } : note
    ));
    setSelectedNoteId(null);
  };
  
  const handleUnarchive = (id) => {
    setNotes(notes.map(note =>
      note.id === id ? { ...note, isArchived: false } : note
    ));
  };
  
  const handleBulkArchive = () => {
    const archivedNotes = notes.filter(note => selectedNotesForBulkAction.includes(note.id));
    setLastDeletedNote(archivedNotes); // Store for undo
    setNotes(notes.map(note =>
      selectedNotesForBulkAction.includes(note.id) ? { ...note, isArchived: true } : note
    ));
    setSelectedNotesForBulkAction([]);
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedNotesForBulkAction.length} notes?`)) {
      const deletedNotes = notes.filter(note => selectedNotesForBulkAction.includes(note.id));
      setLastDeletedNote(deletedNotes); // Store for undo
      setNotes(notes.filter(note => !selectedNotesForBulkAction.includes(note.id)));
      setSelectedNotesForBulkAction([]);
    }
  };

  const handleEdit = (note) => {
    setEditId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setTags(note.tags.join(', '));
    setCategory(note.category || '');
    setPriority(note.priority || 'Medium'); // Set priority
    setDueDate(note.dueDate ? new Date(note.dueDate).toISOString().split('T')[0] : '');
    setColor(note.color || '');
    setSelectedNoteId(note.id);
    setEditorMode('write');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdate = () => {
    setNotes(notes.map(note =>
      note.id === editId ? {
        ...note,
        title,
        content,
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        category: category.trim(),
        priority, // Update priority
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        color,
        updatedAt: new Date().toISOString()
      } : note
    ));
    setEditId(null);
    setTitle('');
    setContent('');
    setTags('');
    setCategory('');
    setPriority('Medium');
    setDueDate('');
    setColor('');
    setEditorMode('write');
  };

  const handleCancel = () => {
    setEditId(null);
    setTitle('');
    setContent('');
    setTags('');
    setCategory('');
    setPriority('Medium');
    setDueDate('');
    setColor('');
    setEditorMode('write');
  };

  const handlePin = (id) => {
    setNotes(notes.map(note =>
      note.id === id ? { ...note, pinned: !note.pinned } : note
    ));
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    });
  };

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const handleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const insertMarkdown = (markdown) => {
    const textarea = contentInputRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentContent = textarea.value;

    const newContent = currentContent.substring(0, start) + markdown + currentContent.substring(end);
    setContent(newContent);
    textarea.focus();
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + markdown.length;
    }, 0);
  };
  
  const getUniqueTags = () => {
    const allTags = notes.flatMap(note => note.tags);
    return [...new Set(allTags)];
  };

  const getUniqueCategories = () => {
    const allCategories = notes.map(note => note.category).filter(cat => cat);
    return [...new Set(allCategories)];
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'High': return 'text-red-500 dark:text-red-400';
      case 'Medium': return 'text-yellow-500 dark:text-yellow-400';
      case 'Low': return 'text-green-500 dark:text-green-400';
      default: return 'text-gray-500 dark:text-gray-400';
    }
  };

  const filterByDueDate = (note, filter) => {
    if (!note.dueDate) return filter === 'no-date';
    const now = new Date();
    const dueDate = new Date(note.dueDate);
    const oneWeek = 7 * 24 * 60 * 60 * 1000;

    if (filter === 'this-week') {
      return dueDate.getTime() - now.getTime() < oneWeek && dueDate.getTime() >= now.getTime();
    }
    if (filter === 'overdue') {
      return dueDate.getTime() < now.getTime();
    }
    return true;
  };
  
  const checkDueSoon = (note) => {
    if (!note.dueDate) return false;
    const now = new Date();
    const dueDate = new Date(note.dueDate);
    const oneDay = 24 * 60 * 60 * 1000;
    return dueDate.getTime() - now.getTime() < oneDay && dueDate.getTime() >= now.getTime();
  };

  const filteredNotes = notes
    .filter(note => note.isArchived === showArchivedNotes)
    .filter(note =>
      (note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
       note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
       note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))) &&
      (filterTags.length === 0 || filterTags.every(ft => note.tags.includes(ft))) &&
      (!filterCategory || note.category === filterCategory) &&
      (!filterDueDate || filterByDueDate(note, filterDueDate))
    )
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return b.pinned ? -1 : 1;
      
      const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
      if (a.priority && b.priority && priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }

      switch (sortBy) {
        case 'newest': return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest': return new Date(a.createdAt) - new Date(b.createdAt);
        case 'title-asc': return a.title.localeCompare(b.title);
        case 'title-desc': return b.title.localeCompare(a.title);
        case 'due-soon':
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
        default: return 0;
      }
    });

  const selectedNote = notes.find(note => note.id === selectedNoteId);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  const handleExport = (fileType) => {
    let fileContent;
    let fileName;
    let fileMimeType;

    if (fileType === 'pdf') {
      window.print();
      return;
    }
    
    if (fileType === 'txt') {
      fileContent = notes.map(note => {
        let exportString = `Title: ${note.title}\n`;
        exportString += `Created: ${formatDate(note.createdAt)}\n`;
        exportString += `Content:\n${note.content}\n\n`;
        if (note.tags.length > 0) {
          exportString += `Tags: ${note.tags.join(', ')}\n`;
        }
        if (note.category) {
          exportString += `Category: ${note.category}\n`;
        }
        if (note.priority) {
          exportString += `Priority: ${note.priority}\n`;
        }
        if (note.dueDate) {
          exportString += `Due Date: ${formatDate(note.dueDate)}\n`;
        }
        exportString += '--------------------\n';
        return exportString;
      }).join('');
      fileName = 'notes_backup.txt';
      fileMimeType = 'text/plain';
    }

    const blob = new Blob([fileContent], { type: fileMimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedNotes = JSON.parse(event.target.result);
          setNotes([...notes, ...importedNotes]);
          alert('Notes imported successfully!');
        } catch (err) {
          alert('Error importing notes: Invalid JSON');
        }
      };
      reader.readAsText(file);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      editorRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const noteColors = [
    { value: '', label: 'Default' },
    { value: 'bg-red-50', label: 'Red' },
    { value: 'bg-blue-50', label: 'Blue' },
    { value: 'bg-green-50', label: 'Green' },
    { value: 'bg-yellow-50', label: 'Yellow' },
    { value: 'bg-purple-50', label: 'Purple' },
  ];

  return (
    <div className="min-h-screen flex flex-col transition-all duration-500">
      
      {/* Markdown Cheat Sheet Modal */}
      {showMarkdownCheatSheet && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-xl max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Markdown Cheat Sheet</h3>
              <button onClick={() => setShowMarkdownCheatSheet(false)} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="prose dark:prose-invert max-w-none">
              <p>**Bold Text**</p>
              <p>*Italic Text*</p>
              <p># H1 Header</p>
              <p>## H2 Header</p>
              <p>- List item</p>
              <p>1. Numbered list item</p>
              <p>[Link Text](https://example.com)</p>
              <p>`inline code`</p>
              <pre><code>
                ```javascript
                // code block
                ```
              </code></pre>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white dark:bg-slate-800 shadow-md py-4 px-6 flex justify-between items-center transition-all duration-300">
        <div className="flex items-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Usman's Smart Notes</h1>
          <p className="ml-4 text-gray-600 dark:text-gray-400">Organize your thoughts</p>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={() => {
              setSelectedNoteId(null);
              setEditId(null);
              setTitle('');
              setContent('');
              setTags('');
              setCategory('');
              setPriority('Medium');
              setDueDate('');
              setColor('');
              setEditorMode('write');
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-200"
          >
            New Note
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition duration-200"
            title="Toggle Theme"
          >
            <i className="fas fa-palette"></i>
          </button>
        </div>
      </header>

      <div className="flex-grow max-w-7xl mx-auto w-full flex flex-col md:flex-row gap-6 py-8 px-4 sm:px-6 lg:px-8">
        {/* Left Sidebar */}
        <aside className="md:w-1/4 bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden p-6 transition-all duration-300 hover:shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {showArchivedNotes ? 'Archived Notes' : 'Notes List'}
            </h2>
            <div className="flex space-x-2">
              {lastDeletedNote && (
                <button
                  onClick={handleUndoDelete}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition duration-200"
                  title="Undo Last Delete"
                >
                  <i className="fas fa-undo"></i>
                </button>
              )}
              <button
                onClick={() => setShowArchivedNotes(!showArchivedNotes)}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition duration-200"
                title={showArchivedNotes ? 'View Active Notes' : 'View Archived Notes'}
              >
                <i className={`fas fa-archive ${showArchivedNotes ? 'text-indigo-600' : ''}`}></i>
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition duration-200"
                title="Settings"
              >
                <i className="fas fa-cog"></i>
              </button>
            </div>
          </div>
          
          {selectedNotesForBulkAction.length > 0 && (
            <div className="bg-indigo-100 dark:bg-indigo-900 p-4 rounded-lg mb-4 flex justify-between items-center animate__animated animate__fadeIn">
              <span className="text-indigo-800 dark:text-indigo-300 font-medium">{selectedNotesForBulkAction.length} selected</span>
              <div className="space-x-2">
                <button
                  onClick={handleBulkArchive}
                  className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition"
                  title="Archive selected"
                >
                  <i className="fas fa-archive"></i>
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition"
                  title="Delete selected"
                >
                  <i className="fas fa-trash"></i>
                </button>
                <button
                  onClick={() => setSelectedNotesForBulkAction([])}
                  className="px-3 py-1 bg-gray-500 text-white rounded-lg text-sm hover:bg-gray-600 transition"
                  title="Cancel"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
          )}

          {showSettings && (
            <div className="mb-6 p-4 bg-gray-100 dark:bg-slate-700 rounded-lg animate__animated animate__fadeIn">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-700 dark:text-gray-300">Theme</span>
                <select
                  value={theme}
                  onChange={e => setTheme(e.target.value)}
                  className="p-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-700 dark:text-white"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-700 dark:text-gray-300">Export Notes</span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleExport('txt')}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-200 text-sm"
                  >
                    Export TXT
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-200 text-sm"
                  >
                    Export PDF
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">Import Notes</span>
                <input type="file" accept=".json" onChange={handleImport} className="hidden" id="import-file" />
                <label
                  htmlFor="import-file"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-200 cursor-pointer text-sm"
                >
                  Import
                </label>
              </div>
            </div>
          )}

          <input
            type="text"
            placeholder="Search notes..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full p-3 mb-4 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-slate-800"
          />

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Tags</label>
            <select
              multiple
              value={filterTags}
              onChange={e => setFilterTags([...e.target.selectedOptions].map(o => o.value))}
              className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-700 dark:text-white"
            >
              {getUniqueTags().map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Category</label>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-700 dark:text-white"
            >
              <option value="">All</option>
              {getUniqueCategories().map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Due Date</label>
            <select
              value={filterDueDate}
              onChange={e => setFilterDueDate(e.target.value)}
              className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-700 dark:text-white"
            >
              <option value="">All</option>
              <option value="this-week">Due This Week</option>
              <option value="overdue">Overdue</option>
              <option value="no-date">No Due Date</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-700 dark:text-white"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="title-asc">Title A-Z</option>
              <option value="title-desc">Title Z-A</option>
              <option value="due-soon">Due Soon</option>
            </select>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-96">
            {filteredNotes.map(note => (
              <div
                key={note.id}
                className={`p-3 rounded-lg cursor-pointer transition duration-200 hover:bg-indigo-50 dark:hover:bg-slate-700 flex items-center ${selectedNoteId === note.id ? 'bg-indigo-100 dark:bg-slate-600' : 'bg-gray-50 dark:bg-slate-900'}`}
              >
                <input
                  type="checkbox"
                  checked={selectedNotesForBulkAction.includes(note.id)}
                  onChange={() => {
                    setSelectedNotesForBulkAction(prev =>
                      prev.includes(note.id)
                        ? prev.filter(id => id !== note.id)
                        : [...prev, note.id]
                    );
                  }}
                  className="mr-3"
                  onClick={(e) => e.stopPropagation()}
                />
                <div onClick={() => setSelectedNoteId(note.id)} className="flex-grow">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900 dark:text-white truncate">{note.title || 'Untitled'}</span>
                    <div className="flex items-center space-x-2">
                        {note.pinned && <i className="fas fa-thumbtack text-indigo-600"></i>}
                        {checkDueSoon(note) && <i className="fas fa-bell text-red-500 animate-pulse"></i>}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{formatDate(note.createdAt)}</span>
                    <span className={`font-semibold ${getPriorityColor(note.priority)}`}>{note.priority} Priority</span>
                  </div>
                </div>
              </div>
            ))}
            {filteredNotes.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400">No notes found</p>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main ref={editorRef} className="flex-grow bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden p-6 transition-all duration-300 hover:shadow-lg">
          {selectedNoteId && selectedNote ? (
            editId === selectedNoteId ? (
              // Edit Mode
              <div className="animate__animated animate__fadeIn">
                <input
                  type="text"
                  placeholder="Note title..."
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full p-4 mb-4 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-slate-800"
                />

                <div className="flex mb-4">
                  <button
                    onClick={() => setEditorMode('write')}
                    className={`flex-1 p-2 ${editorMode === 'write' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300'} rounded-l-lg`}
                  >
                    Write
                  </button>
                  <button
                    onClick={() => setEditorMode('preview')}
                    className={`flex-1 p-2 ${editorMode === 'preview' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300'}`}
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => setEditorMode('split')}
                    className={`flex-1 p-2 ${editorMode === 'split' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300'} rounded-r-lg`}
                  >
                    Split
                  </button>
                </div>
                
                <div className="mb-4 flex space-x-2 flex-wrap">
                  <button onClick={() => insertMarkdown('**Text**')} className="p-2 text-sm bg-gray-200 dark:bg-slate-700 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition"><i className="fas fa-bold"></i></button>
                  <button onClick={() => insertMarkdown('*Text*')} className="p-2 text-sm bg-gray-200 dark:bg-slate-700 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition"><i className="fas fa-italic"></i></button>
                  <button onClick={() => insertMarkdown('`code`')} className="p-2 text-sm bg-gray-200 dark:bg-slate-700 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition"><i className="fas fa-code"></i></button>
                  <button onClick={() => insertMarkdown('- List item')} className="p-2 text-sm bg-gray-200 dark:bg-slate-700 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition"><i className="fas fa-list-ul"></i></button>
                  <button onClick={() => insertMarkdown('[Link Text](url)')} className="p-2 text-sm bg-gray-200 dark:bg-slate-700 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition"><i className="fas fa-link"></i></button>
                  <button onClick={() => setShowMarkdownCheatSheet(true)} className="p-2 text-sm bg-gray-200 dark:bg-slate-700 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition" title="Markdown Cheat Sheet"><i className="fas fa-question-circle"></i></button>
                </div>

                <div className={`grid ${editorMode === 'split' ? 'grid-cols-2 gap-4' : 'grid-cols-1'}`}>
                  {(editorMode === 'write' || editorMode === 'split') && (
                    <textarea
                      ref={contentInputRef}
                      placeholder="Write your note here... (Markdown supported)"
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      rows={10}
                      className="w-full p-4 mb-4 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-slate-800"
                    />
                  )}
                  {(editorMode === 'preview' || editorMode === 'split') && (
                    <div
                      className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 mb-4 p-4 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 overflow-auto"
                      dangerouslySetInnerHTML={{ __html: marked ? marked.parse(content) : content }}
                    />
                  )}
                </div>

                <div className="flex justify-between items-center mb-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Word count: {wordCount}</div>
                  {('webkitSpeechRecognition' in window) && (
                    <button
                      onClick={handleVoiceInput}
                      className={`px-4 py-2 bg-red-600 text-white rounded-lg transition duration-200 hover:bg-red-700 ${isListening ? 'animate-pulse' : ''}`}
                      title="Voice Typing"
                    >
                      <i className="fas fa-microphone"></i> {isListening ? 'Listening...' : 'Voice Type'}
                    </button>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tags (comma separated)</label>
                  <input
                    type="text"
                    placeholder="Tags (e.g., react, javascript)"
                    value={tags}
                    onChange={e => setTags(e.target.value)}
                    className="w-full p-4 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-slate-800"
                    list="tag-list"
                  />
                  <datalist id="tag-list">
                    {getUniqueTags().map(tag => <option key={tag} value={tag} />)}
                  </datalist>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
                  <input
                    type="text"
                    placeholder="Category (e.g., Work, Personal)"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full p-4 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-slate-800"
                    list="category-list"
                  />
                  <datalist id="category-list">
                    {getUniqueCategories().map(cat => <option key={cat} value={cat} />)}
                  </datalist>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value)}
                    className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-700 dark:text-white"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <input
                  type="date"
                  placeholder="Due Date..."
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full p-4 mb-4 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-slate-800"
                />

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Note Color</label>
                  <select
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-700 dark:text-white"
                  >
                    {noteColors.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={toggleFullscreen}
                    className="px-4 py-3 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  </button>
                  <button
                    onClick={handleUpdate}
                    className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    Update Note
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-6 py-3 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              // View Mode
              <div className={`animate__animated animate__fadeIn ${selectedNote.color}`}>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">{selectedNote.title || 'Untitled Note'}</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(selectedNote)}
                      className="p-2 text-indigo-600 hover:text-indigo-800 rounded-full hover:bg-indigo-50 dark:hover:bg-slate-700 transition duration-200"
                      title="Edit"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button
                      onClick={() => handlePin(selectedNote.id)}
                      className="p-2 text-yellow-600 hover:text-yellow-800 rounded-full hover:bg-yellow-50 dark:hover:bg-slate-700 transition duration-200"
                      title={selectedNote.pinned ? 'Unpin' : 'Pin'}
                    >
                      <i className={`fas fa-thumbtack ${selectedNote.pinned ? 'text-yellow-600' : ''}`}></i>
                    </button>
                    <button
                      onClick={() => handleCopy(selectedNote.content)}
                      className="p-2 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-50 dark:hover:bg-slate-700 transition duration-200"
                      title="Copy"
                    >
                      <i className="fas fa-copy"></i>
                    </button>
                    {showArchivedNotes ? (
                      <button
                        onClick={() => handleUnarchive(selectedNote.id)}
                        className="p-2 text-teal-600 hover:text-teal-800 rounded-full hover:bg-teal-50 dark:hover:bg-slate-700 transition duration-200"
                        title="Unarchive"
                      >
                        <i className="fas fa-box-open"></i>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleArchive(selectedNote.id)}
                        className="p-2 text-orange-600 hover:text-orange-800 rounded-full hover:bg-orange-50 dark:hover:bg-slate-700 transition duration-200"
                        title="Archive"
                      >
                        <i className="fas fa-archive"></i>
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(selectedNote.id)}
                      className="p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-red-50 dark:hover:bg-slate-700 transition duration-200"
                      title="Delete"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
                <div
                  className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 mb-4"
                  dangerouslySetInnerHTML={{ __html: marked ? marked.parse(selectedNote.content) : selectedNote.content }}
                />
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedNote.tags.map(tag => (
                    <span key={tag} className="px-3 py-1 bg-indigo-100 dark:bg-slate-700 text-indigo-800 dark:text-indigo-300 rounded-full text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
                {selectedNote.category && (
                  <div className="mb-4">
                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 rounded-full text-sm">
                      Category: {selectedNote.category}
                    </span>
                  </div>
                )}
                {selectedNote.priority && (
                  <div className="mb-4">
                    <span className={`px-3 py-1 font-semibold text-sm rounded-full ${selectedNote.priority === 'High' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300' : selectedNote.priority === 'Medium' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300' : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300'}`}>
                      Priority: {selectedNote.priority}
                    </span>
                  </div>
                )}
                {selectedNote.dueDate && (
                  <div className="mb-4 text-red-600 dark:text-red-400">
                    Due: {formatDate(selectedNote.dueDate)}
                  </div>
                )}
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedNote.updatedAt ? `Updated: ${formatDate(selectedNote.updatedAt)}` : `Created: ${formatDate(selectedNote.createdAt)}`}
                </div>
              </div>
            )
          ) : (
            // New Note Editor
            <div className="animate__animated animate__fadeIn">
              <input
                type="text"
                placeholder="Note title..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full p-4 mb-4 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-slate-800"
              />

              <div className="flex mb-4">
                <button
                  onClick={() => setEditorMode('write')}
                  className={`flex-1 p-2 ${editorMode === 'write' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300'} rounded-l-lg`}
                >
                  Write
                </button>
                <button
                  onClick={() => setEditorMode('preview')}
                  className={`flex-1 p-2 ${editorMode === 'preview' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300'}`}
                >
                  Preview
                </button>
                <button
                  onClick={() => setEditorMode('split')}
                  className={`flex-1 p-2 ${editorMode === 'split' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300'} rounded-r-lg`}
                >
                  Split
                </button>
              </div>
              
              <div className="mb-4 flex space-x-2 flex-wrap">
                  <button onClick={() => insertMarkdown('**Text**')} className="p-2 text-sm bg-gray-200 dark:bg-slate-700 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition"><i className="fas fa-bold"></i></button>
                  <button onClick={() => insertMarkdown('*Text*')} className="p-2 text-sm bg-gray-200 dark:bg-slate-700 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition"><i className="fas fa-italic"></i></button>
                  <button onClick={() => insertMarkdown('`code`')} className="p-2 text-sm bg-gray-200 dark:bg-slate-700 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition"><i className="fas fa-code"></i></button>
                  <button onClick={() => insertMarkdown('- List item')} className="p-2 text-sm bg-gray-200 dark:bg-slate-700 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition"><i className="fas fa-list-ul"></i></button>
                  <button onClick={() => insertMarkdown('[Link Text](url)')} className="p-2 text-sm bg-gray-200 dark:bg-slate-700 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition"><i className="fas fa-link"></i></button>
                  <button onClick={() => setShowMarkdownCheatSheet(true)} className="p-2 text-sm bg-gray-200 dark:bg-slate-700 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition" title="Markdown Cheat Sheet"><i className="fas fa-question-circle"></i></button>
              </div>

              <div className={`grid ${editorMode === 'split' ? 'grid-cols-2 gap-4' : 'grid-cols-1'}`}>
                {(editorMode === 'write' || editorMode === 'split') && (
                  <textarea
                    ref={contentInputRef}
                    placeholder="Write your note here... (Markdown supported)"
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    rows={10}
                    className="w-full p-4 mb-4 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-slate-800"
                  />
                )}
                {(editorMode === 'preview' || editorMode === 'split') && (
                  <div
                    className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 mb-4 p-4 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 overflow-auto"
                    dangerouslySetInnerHTML={{ __html: marked ? marked.parse(content) : content }}
                  />
                )}
              </div>

              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">Word count: {wordCount}</div>
                {('webkitSpeechRecognition' in window) && (
                  <button
                    onClick={handleVoiceInput}
                    className={`px-4 py-2 bg-red-600 text-white rounded-lg transition duration-200 hover:bg-red-700 ${isListening ? 'animate-pulse' : ''}`}
                    title="Voice Typing"
                  >
                    <i className="fas fa-microphone"></i> {isListening ? 'Listening...' : 'Voice Type'}
                  </button>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tags (comma separated)</label>
                <input
                  type="text"
                  placeholder="Tags (e.g., react, javascript)"
                  value={tags}
                  onChange={e => setTags(e.target.value)}
                  className="w-full p-4 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-slate-800"
                  list="tag-list"
                />
                <datalist id="tag-list">
                  {getUniqueTags().map(tag => <option key={tag} value={tag} />)}
                </datalist>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
                <input
                  type="text"
                  placeholder="Category (e.g., Work, Personal)"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full p-4 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-slate-800"
                  list="category-list"
                />
                <datalist id="category-list">
                  {getUniqueCategories().map(cat => <option key={cat} value={cat} />)}
                </datalist>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                  className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-700 dark:text-white"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <input
                type="date"
                placeholder="Due Date..."
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full p-4 mb-4 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-slate-800"
              />

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Note Color</label>
                <select
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-700 dark:text-white"
                >
                  {noteColors.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={toggleFullscreen}
                  className="px-4 py-3 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                </button>
                <button
                  onClick={handleAdd}
                  className={`px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 transition duration-200 transform ${isAnimating ? 'animate__animated animate__pulse' : ''} focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
                >
                  {notes.length === 0 ? 'Create Your First Note' : 'Add New Note'}
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Right Sidebar */}
        <aside className="md:w-1/4 bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden p-6 transition-all duration-300 hover:shadow-lg hidden md:block">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="space-y-4">
            <button
              onClick={() => {
                setSelectedNoteId(null);
                setEditId(null);
                setTitle('');
                setContent('');
                setTags('');
                setCategory('');
                setPriority('Medium');
                setDueDate('');
                setColor('');
                setEditorMode('write');
              }}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-200"
            >
              Create New Note
            </button>
            <button
              onClick={() => handleExport('txt')}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-200"
            >
              Export All to TXT
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-200"
            >
              Export All to PDF
            </button>
            <div>
              <input type="file" accept=".json" onChange={handleImport} className="hidden" id="import-side-file" />
              <label
                htmlFor="import-side-file"
                className="w-full block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200 cursor-pointer text-center"
              >
                Import Notes
              </label>
            </div>
            <div className="text-center text-gray-600 dark:text-gray-400">
              Total Notes: {notes.filter(note => !note.isArchived).length}
            </div>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-800 shadow-md py-4 px-6 text-center transition-all duration-300">
        <p className="text-gray-600 dark:text-gray-400">
          © {new Date().getFullYear()} Ultimate Notes App. All rights reserved.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Built with React & Tailwind CSS
        </p>
      </footer>
    </div>
  );
}

export default App;