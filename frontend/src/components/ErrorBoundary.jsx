// src/components/ErrorBoundary.jsx — catches render crashes app-wide
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="center-page">
          <div className="card" style={{ maxWidth: 480, textAlign: 'center' }}>
            <h2>Something went wrong</h2>
            <p className="text-muted">
              {String(this.state.error?.message || this.state.error)}
            </p>
            <button
              className="btn-primary"
              style={{ marginTop: '0.75rem' }}
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}