import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, LockKeyhole, LogIn, ShieldCheck } from 'lucide-react';
import JamatiaLogo from '@/components/shell/JamatiaLogo';
import { useAuth } from '@/context/AuthContext';

export default function AdminLoginPage(){
  const { signIn, loading } = useAuth();
  const navigate = useNavigate();
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');

  const submit = async event => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await signIn(email.trim(),password);
      navigate('/admin',{replace:true});
    } catch (err) {
      setError(err?.message || 'Unable to sign in.');
      setBusy(false);
    }
  };

  return <main className="admin-login-page">
    <div className="admin-login-orb admin-login-orb-one"/>
    <div className="admin-login-orb admin-login-orb-two"/>
    <section className="admin-login-card jic-popup-surface" aria-labelledby="admin-login-title">
      <div className="admin-login-topline">
        <Link to="/" className="admin-login-back"><ArrowLeft size={16}/> Website</Link>
        <span className="admin-login-secure"><ShieldCheck size={15}/> JIC staff</span>
      </div>
      <div className="admin-login-brand">
        <Link to="/" className="admin-login-logo" aria-label="Return to Jamatia Islamic Centre website"><JamatiaLogo/></Link>
        <div><p>JAMATIA ISLAMIC CENTRE</p><h1 id="admin-login-title">Administration</h1></div>
      </div>
      {error && <div className="admin-login-error">{error}</div>}
      <form onSubmit={submit} className="admin-login-form">
        <label><span>Email address</span><input type="email" required inputMode="email" autoCapitalize="none" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address"/></label>
        <label><span>Password</span><div className="admin-login-password"><LockKeyhole size={17}/><input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password"/></div></label>
        <button disabled={busy||loading}><LogIn size={18}/>{busy?'Signing in…':'Sign in'}</button>
      </form>
    </section>
  </main>;
}
