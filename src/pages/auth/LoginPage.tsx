// import React, { useEffect } from 'react';
// import { Link, useNavigate } from 'react-router-dom';
// import AuthLayout from '../../layouts/AuthLayout';
// import LoginForm from '../../components/auth/LoginForm';
// import { useAuth } from '../../contexts/AuthContext';

// const LoginPage: React.FC = () => {
//   const navigate = useNavigate();
//   const { currentUser, resetPassword } = useAuth();

//   // Redirect if already logged in
//   useEffect(() => {
//     if (currentUser) {
//       switch (currentUser.role) {
//         case 'superadmin':
//           navigate('/superadmin');
//           break;
//         case 'admin':
//           navigate('/admin');
//           break;
//         case 'manager':
//           navigate('/manager');
//           break;
//         case 'salesperson':
//           navigate('/sales');
//           break;
//         default:
//           navigate('/');
//       }
//     }
//   }, [currentUser, navigate]);

//   const handleForgotPassword = async (email: string) => {
//     try {
//       await resetPassword(email);
//       alert('Password reset email sent! Please check your inbox.');
//     } catch (error) {
//       console.error('Password reset error:', error);
//       alert('Failed to send password reset email. Please try again.');
//     }
//   };

//   return (
//     <AuthLayout 
//       title="Welcome back" 
//       subtitle="Sign in to your account"
//     >
//       <LoginForm />
      
//       <div className="mt-4 text-center">
//         <button
//           onClick={() => {
//             const email = prompt('Please enter your email address:');
//             if (email) handleForgotPassword(email);
//           }}
//           className="text-sm text-green-600 hover:text-green-500 transition-colors duration-200"
//         >
//           Forgot your password?
//         </button>
//       </div>

//       <div className="mt-6">
//         <div className="relative">
//           <div className="absolute inset-0 flex items-center">
//             <div className="w-full border-t border-gray-300"></div>
//           </div>
//           <div className="relative flex justify-center text-sm">
//             <span className="px-2 bg-white text-gray-500">
//               Don't have an account?
//             </span>
//           </div>
//         </div>

//         <div className="mt-6">
//           <Link
//             to="/register"
//             className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-green-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200"
//           >
//             Sign up
//           </Link>
//         </div>
//       </div>
//     </AuthLayout>
//   );
// };

// export default LoginPage;


// //glass effect bad backup
// import React, { useEffect } from 'react'; 
// import { Link, useNavigate } from 'react-router-dom'; 
// import AuthLayout from '../../layouts/AuthLayout'; 
// import LoginForm from '../../components/auth/LoginForm'; 
// import { useAuth } from '../../contexts/AuthContext'; 
 
// const LoginPage: React.FC = () => { 
//   const navigate = useNavigate(); 
//   const { currentUser, resetPassword } = useAuth(); 
 
//   // Redirect if already logged in 
//   useEffect(() => { 
//     if (currentUser) { 
//       switch (currentUser.role) { 
//         case 'superadmin': 
//           navigate('/superadmin'); 
//           break; 
//         case 'admin': 
//           navigate('/admin'); 
//           break; 
//         case 'manager': 
//           navigate('/manager'); 
//           break; 
//         case 'salesperson': 
//           navigate('/sales'); 
//           break; 
//         default: 
//           navigate('/'); 
//       } 
//     } 
//   }, [currentUser, navigate]); 
 
//   const handleForgotPassword = async (email: string) => { 
//     try { 
//       await resetPassword(email); 
//       alert('Password reset email sent! Please check your inbox.'); 
//     } catch (error) { 
//       console.error('Password reset error:', error); 
//       alert('Failed to send password reset email. Please try again.'); 
//     } 
//   }; 
 
//   return ( 
//     <div className="min-h-screen relative overflow-hidden">
//       {/* Blurred Restaurant Background */}
//       <div 
//         className="absolute inset-0 bg-cover bg-center bg-no-repeat"
//         style={{
//           backgroundImage: `url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')`
//         }}
//       />
      
//       {/* Blur overlay */}
//       <div className="absolute inset-0 backdrop-blur-sm bg-black/20" />
      
//       {/* Additional restaurant ambiance overlay */}
//       <div 
//         className="absolute inset-0 opacity-30"
//         style={{
//           background: 'linear-gradient(45deg, rgba(139, 69, 19, 0.3), rgba(218, 165, 32, 0.2), rgba(0, 0, 0, 0.4))'
//         }}
//       />

//       {/* Content Container */}
//       <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
//         {/* Glassmorphism Form Container */}
//         <div className="w-full max-w-md">
//           {/* Glass card with enhanced glassmorphism */}
//           <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8 relative overflow-hidden">
//             {/* Subtle gradient overlay for extra depth */}
//             <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl" />
            
//             {/* Content */}
//             <div className="relative z-10">
//               {/* Header */}
//               <div className="text-center mb-8">
//                 <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">
//                   Welcome back
//                 </h1>
//                 <p className="text-white/80 text-lg drop-shadow-md">
//                   Sign in to your account
//                 </p>
//               </div>

//               {/* Login Form Container with additional glass effect */}
//               {/* <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-6 mb-6 shadow-inner"> */}
//               <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-6 mb-6 shadow-inner">
//                 <LoginForm />
//               </div>
               
//               {/* Forgot Password */}
//               <div className="text-center mb-6">
//                 <button 
//                   onClick={() => { 
//                     const email = prompt('Please enter your email address:'); 
//                     if (email) handleForgotPassword(email); 
//                   }} 
//                   className="text-white/90 hover:text-white transition-all duration-300 text-sm font-medium backdrop-blur-sm bg-white/10 px-4 py-2 rounded-lg border border-white/20 hover:bg-white/20 hover:border-white/30 shadow-lg"
//                 > 
//                   Forgot your password? 
//                 </button> 
//               </div> 
     
//               {/* Divider */}
//               <div className="mb-6"> 
//                 <div className="relative"> 
//                   <div className="absolute inset-0 flex items-center"> 
//                     <div className="w-full border-t border-white/30"></div> 
//                   </div> 
//                   <div className="relative flex justify-center text-sm"> 
//                     <span className="px-4 bg-white/10 text-white/80 backdrop-blur-sm rounded-full border border-white/20"> 
//                       Don't have an account? 
//                     </span> 
//                   </div> 
//                 </div> 
//               </div>
     
//               {/* Sign Up Button */}
//               <div> 
//                 <Link 
//                   to="/register" 
//                   className="w-full flex justify-center py-3 px-6 border border-white/30 rounded-xl shadow-lg text-sm font-medium text-white bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-300 backdrop-blur-md hover:border-white/40 hover:shadow-xl transform hover:scale-[1.02]"
//                 > 
//                   Sign up 
//                 </Link> 
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   ); 
// }; 
 
// export default LoginPage;

import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import LoginForm from '../../components/auth/LoginForm';
import { useAuth } from '../../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, loading, resetPassword } = useAuth();
  const [searchParams] = useSearchParams();
  const [prefilledEmail, setPrefilledEmail] = useState('');
  const [showApprovalMessage, setShowApprovalMessage] = useState(false);

  // Check for URL parameters
  useEffect(() => {
    const message = searchParams.get('message');
    const email = searchParams.get('email');
    
    if (message === 'approval_required') {
      setShowApprovalMessage(true);
      if (email) {
        setPrefilledEmail(decodeURIComponent(email));
      }
    }
  }, [searchParams]);

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser && currentUser.role && !loading) {
      switch (currentUser.role) {
        case 'superadmin':
          navigate('/superadmin');
          break;
        case 'admin':
          navigate('/admin');
          break;
        case 'manager':
          navigate('/manager');
          break;
        case 'staff':
          navigate('/staff');
          break;
        default:
          navigate('/');
      }
    }
  }, [currentUser, currentUser?.role, loading, navigate]);

  const handleForgotPassword = async (email: string) => {
    try {
      await resetPassword(email);
      alert('Password reset email sent! Please check your inbox.');
    } catch (error) {
      console.error('Password reset error:', error);
      alert('Failed to send password reset email. Please try again.');
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* BG and overlays */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1543158181-1274e5362710?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')`
        }}
      />
      <div className="absolute inset-0 backdrop-blur-sm bg-black/20" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: 'linear-gradient(45deg, rgba(139, 69, 19, 0.3), rgba(218, 165, 32, 0.2), rgba(0, 0, 0, 0.4))'
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          {/* Glassmorphism only for main card */}
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl" />
            <div className="relative z-10">
              {/* Header */}
              <div className="text-center mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 drop-shadow-lg">
                  Welcome back
                </h1>
                <p className="text-white/80 text-base sm:text-lg drop-shadow-md">
                  Sign in to your account
                </p>
              </div>
              
              {/* Approval Message */}
              {showApprovalMessage && (
                <div className="mb-6 bg-yellow-50/90 backdrop-blur-sm border border-yellow-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        Registration Successful! ⏳
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>
                          Your account has been created successfully. Please wait for a super administrator to approve your account before you can log in.
                        </p>
                        <p className="mt-1">
                          You will be able to log in once your account is approved.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Login Form */}
              <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6 mb-6 shadow-inner">
                <LoginForm prefilledEmail={prefilledEmail} />
              </div>

              {/* Forgot Password (FLAT & SIMPLE) */}
              <div className="text-center mb-6">
                <button
                  onClick={() => {
                    const email = prompt('Please enter your email address:');
                    if (email) handleForgotPassword(email);
                  }}
                  className="text-green-200 hover:text-green-400 transition-colors duration-200 text-sm font-medium underline underline-offset-2 focus:outline-none"
                >
                  Forgot your password?
                </button>
              </div>

              {/* Divider (FLAT & SIMPLE) */}
              <div className="mb-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/30"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-transparent text-white/70">
                      Don't have an account?
                    </span>
                  </div>
                </div>
              </div>

              {/* Sign Up Buttons (FLAT & SIMPLE) */}
              <div className="space-y-2">
                <Link
                  to="/register"
                  className="w-full flex justify-center py-2 px-4 rounded-md text-sm font-medium text-green-100 border border-green-700/20 hover:bg-green-700/10 hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-600"
                >
                  Sign up
                </Link>
                <Link
                  to="/register-superadmin"
                  className="w-full flex justify-center py-2 px-4 rounded-md text-sm font-medium text-yellow-100 border border-yellow-700/20 hover:bg-yellow-700/10 hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-600"
                >
                  Super Admin Registration
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;