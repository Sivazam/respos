// import React, { useState, useEffect } from 'react';
// import { Link, useNavigate } from 'react-router-dom';
// import AuthLayout from '../../layouts/AuthLayout';
// import RegisterForm from '../../components/auth/RegisterForm';
// import { useAuth } from '../../contexts/AuthContext';

// const RegisterPage: React.FC = () => {
//   const navigate = useNavigate();
//   const { currentUser } = useAuth();
//   const [isSuperAdmin, setIsSuperAdmin] = useState(false);

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

//   const handleSuccessfulRegister = () => {
//     // After successful registration, redirect to the appropriate page
//     // The auth state change will handle the actual redirection
//   };

//   const toggleSuperAdminMode = () => {
//     setIsSuperAdmin(!isSuperAdmin);
//   };

//   return (
//     <AuthLayout 
//       title={isSuperAdmin ? "Create Super Admin Account" : "Create your account"} 
//       subtitle={isSuperAdmin 
//         ? "This will create a Super Admin account with full system access" 
//         : "Your account will need to be activated by an administrator before you can log in."}
//     >
//       <RegisterForm 
//         onSuccess={handleSuccessfulRegister} 
//         allowRoleSelection={true}
//         isSuperAdmin={isSuperAdmin}
//       />
      
//       <div className="mt-6">
//         <div className="relative">
//           <div className="absolute inset-0 flex items-center">
//             <div className="w-full border-t border-gray-300"></div>
//           </div>
//           <div className="relative flex justify-center text-sm">
//             <span className="px-2 bg-white text-gray-500">
//               Already have an account?
//             </span>
//           </div>
//         </div>

//         <div className="mt-6">
//           <Link
//             to="/login"
//             className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-green-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
//           >
//             Sign in
//           </Link>
//         </div>
//       </div>

//       {/* Super Admin toggle - visible for initial setup */}
//       <div className="mt-8 text-center">
//         <button 
//           onClick={toggleSuperAdminMode}
//           className="text-xs text-gray-400 hover:text-gray-600"
//         >
//           {isSuperAdmin ? "Switch to Regular Registration" : "Switch to Super Admin Registration"}
//         </button>
//       </div>
//     </AuthLayout>
//   );
// };

// export default RegisterPage;


import React, { useState, useEffect } from 'react'; 
import { Link, useNavigate } from 'react-router-dom'; 
import AuthLayout from '../../layouts/AuthLayout'; 
import RegisterForm from '../../components/auth/RegisterForm'; 
import AdminRegisterForm from '../../components/auth/AdminRegisterForm';
import FranchiseRegisterForm from '../../components/auth/FranchiseRegisterForm';
import { useAuth } from '../../contexts/AuthContext'; 
 
const RegisterPage: React.FC = () => { 
  const navigate = useNavigate(); 
  const { currentUser } = useAuth(); 
  const [isSuperAdmin, setIsSuperAdmin] = useState(false); 
 
  // Redirect if already logged in 
  useEffect(() => { 
    if (currentUser) { 
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
        case 'salesperson': 
          navigate('/staff'); 
          break; 
        default: 
          navigate('/'); 
      } 
    } 
  }, [currentUser, navigate]); 
 
  const handleSuccessfulRegister = (email?: string) => { 
    // After successful registration, redirect to login page with approval message
    navigate('/login?message=approval_required&email=' + encodeURIComponent(email || ''));
  }; 
 
  const toggleSuperAdminMode = () => { 
    setIsSuperAdmin(!isSuperAdmin); 
  }; 
 
  return ( 
    <div className="min-h-screen relative overflow-hidden">
      {/* Blurred Restaurant Background - Different image for variety */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')`
        }}
      />
      
      {/* Blur overlay */}
      <div className="absolute inset-0 backdrop-blur-sm bg-black/25" />
      
      {/* Additional restaurant ambiance overlay */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: 'linear-gradient(135deg, rgba(139, 69, 19, 0.2), rgba(218, 165, 32, 0.3), rgba(101, 67, 33, 0.4))'
        }}
      />

      {/* Content Container */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        {/* Glassmorphism Form Container */}
        <div className="w-full max-w-lg">
          {/* Glass card with enhanced glassmorphism */}
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8 relative overflow-hidden">
            {/* Subtle gradient overlay for extra depth */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl" />
            
            {/* Content */}
            <div className="relative z-10">
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">
                  {isSuperAdmin ? "Create Super Admin Account" : "Create your account"}
                </h1>
                <p className="text-white/80 text-base drop-shadow-md leading-relaxed">
                  {isSuperAdmin
                    ? "This will create a Super Admin account with full system access"
                    : "Your account will need to be activated by an administrator before you can log in."}
                </p>
              </div>

              {/* Register Form Container with additional glass effect */}
              <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-6 mb-6 shadow-inner">
                {isSuperAdmin ? (
                  <RegisterForm 
                    onSuccess={handleSuccessfulRegister} 
                    allowRoleSelection={false}
                    isSuperAdmin={isSuperAdmin} 
                  />
                ) : (
                  <FranchiseRegisterForm 
                    onSuccess={handleSuccessfulRegister} 
                    allowRoleSelection={true}
                    isSuperAdmin={false} 
                  />
                )}
              </div>
              
              {/* Divider */}
              <div className="mb-6"> 
                <div className="relative"> 
                  <div className="absolute inset-0 flex items-center"> 
                    <div className="w-full border-t border-white/30"></div> 
                  </div> 
                  <div className="relative flex justify-center text-sm"> 
                    <span className="px-4 bg-white/10 text-white/80 backdrop-blur-sm rounded-full border border-white/20"> 
                      Already have an account? 
                    </span> 
                  </div> 
                </div> 
              </div>
     
              {/* Sign In Button */}
              <div className="mb-8"> 
                <Link 
                  to="/login" 
                  className="w-full flex justify-center py-3 px-6 border border-white/30 rounded-xl shadow-lg text-sm font-medium text-white bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-300 backdrop-blur-md hover:border-white/40 hover:shadow-xl transform hover:scale-[1.02]"
                > 
                  Sign in 
                </Link> 
              </div>

              {/* Super Admin Toggle */}
              <div className="text-center">
                <button 
                  onClick={toggleSuperAdminMode}
                  className="text-xs text-white/60 hover:text-white/90 transition-all duration-300 backdrop-blur-sm bg-white/5 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10 hover:border-white/20 shadow-md hover:shadow-lg"
                >
                  {isSuperAdmin ? "Switch to Regular Registration" : "Switch to Super Admin Registration"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  ); 
}; 
 
export default RegisterPage;