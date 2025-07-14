"use client"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, User, Plus, Edit3, Trash2, Save, X, Eye, EyeOff, Search, Check, AlertCircle } from "lucide-react"
import { useAuth } from "./Context/AuthContext"

const StaffUser = () => {
  const navigate = useNavigate()
  const { user } = useAuth() // Use Auth context to get current user
  const [staffMembers, setStaffMembers] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [isAddingStaff, setIsAddingStaff] = useState(false)
  const [isEditingStaff, setIsEditingStaff] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  // Admin row index - this is the row where the logged-in admin is found
  const [adminRowIndex, setAdminRowIndex] = useState(null)
  // Available permissions list
  const [availablePermissions, setAvailablePermissions] = useState([
    { id: "dashboard", label: "Dashboard" },
    { id: "appointment", label: "Appointment" },
    { id: "runningappointment", label: "Running Appointment" },
    { id: "appointmenthistory", label: "Appointment History" },
    { id: "staff", label: "Staff" },
    { id: "staffattendance", label: "Staff Attendance" },
    { id: "staffdb", label: "Staff DB" },
    { id: "staffhistory", label: "Staff History" },
    { id: "inventory", label: "Inventory" },
    { id: "services", label: "Services" },
    { id: "paymentcommission", label: "Payment + Commission" },
    { id: "customers", label: "Customers" },
    { id: "promocards", label: "Promo Cards" },
    { id: "license", label: "License" },
    { id: "whatsapptemplate", label: "WhatsApp Template" },
    { id: "all", label: "All Permissions" }
  ])
  
  // Available user IDs for dropdown - this will be populated from Staff DB sheet
  const [availableUserIds, setAvailableUserIds] = useState([
    "staff1", "staff2", "staff3", "hairstylist1", "hairstylist2", 
    "receptionist1", "manager1", "assistant1", "assistant2"
  ])
  
  // Simplified form state for adding/editing staff with permissions
  const [formData, setFormData] = useState({
    id: "",
    userId: "",
    password: "",
    role: "staff", // Default role, will be removed from UI
    permissions: [], // Array of selected permission ids
  })

  // Staff positions with their corresponding columns
  const staffPositions = [
    { name: "Staff 1", usernameCol: 16, passwordCol: 17, roleCol: 18, columns: "Q/R/S" },
    { name: "Staff 2", usernameCol: 19, passwordCol: 20, roleCol: 21, columns: "T/U/V" },
    { name: "Staff 3", usernameCol: 22, passwordCol: 23, roleCol: 24, columns: "W/X/Y" },
    { name: "Staff 4", usernameCol: 25, passwordCol: 26, roleCol: 27, columns: "Z/AA/AB" },
    // Add more staff positions as needed
  ];

  // Fetch staff members on component mount
  useEffect(() => {
    fetchStaffNames() // First fetch the staff names for the dropdown
    fetchStaffMembers() // Then fetch staff members data
  }, [])
  
  // Function to fetch staff names from Staff DB sheet for dropdown
  const fetchStaffNames = async () => {
    try {
      console.log("Fetching staff names from Staff DB sheet...");
      
      // Use the specific sheet details from user context
      const currentSheetId = user?.sheetId || '1zEik6_I7KhRQOucBhk1FW_67IUEdcSfEHjCaR37aK_U';
      const staffSheetName = 'Staff DB'; // The sheet containing staff names
      
      console.log("Using sheet ID from user context:", currentSheetId);
      
      // Create URL to fetch the Staff DB sheet in JSON format
      const url = `https://docs.google.com/spreadsheets/d/${currentSheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(staffSheetName)}`;
      
      console.log("Fetching staff names from URL:", url);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch staff data: ${response.status}`);
      }
      
      // Extract the JSON part from the response
      const text = await response.text();
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      const jsonString = text.substring(jsonStart, jsonEnd + 1);
      const data = JSON.parse(jsonString);
      
      // Process the staff data
      if (!data.table || !data.table.rows) {
        throw new Error("Invalid staff data format");
      }
      
      // Extract staff names from column D (index 3) of the Staff DB sheet
      const staffNames = [];
      
      data.table.rows.forEach(row => {
        if (row.c && row.c[3] && row.c[3].v) { // Column D (index 3)
          const staffName = row.c[3].v.toString().trim();
          if (staffName !== "") {
            staffNames.push(staffName);
          }
        }
      });
      
      console.log("Successfully fetched staff names:", staffNames);
      
      // Set the dropdown options using ONLY the staff names from the Staff DB sheet
      if (staffNames.length > 0) {
        setAvailableUserIds(staffNames);
      } else {
        console.warn("No staff names found in the Staff DB sheet");
        // Fallback to default list if no names are found
        setAvailableUserIds([
          "staff1", "staff2", "staff3", "hairstylist1", "hairstylist2", 
          "receptionist1", "manager1", "assistant1", "assistant2"
        ]);
      }
      
    } catch (error) {
      console.error("Error fetching staff names:", error);
      // Fallback to default list if fetching fails
      setAvailableUserIds([
        "staff1", "staff2", "staff3", "hairstylist1", "hairstylist2", 
        "receptionist1", "manager1", "assistant1", "assistant2"
      ]);
    }
  };

  // Function to fetch staff members from Google Sheets
  const fetchStaffMembers = async () => {
    try {
      setIsLoading(true);
      setError("");
      
      // Use the specific sheet details provided
      const sheetId = "1zEik6_I7KhRQOucBhk1FW_67IUEdcSfEHjCaR37aK_U";
      const sheetName = "Clients"; // We'll use the Clients sheet since staff credentials are stored there
      
      // Fetch the Clients sheet data
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status}`);
      }
      
      // Extract the JSON part from the response
      const text = await response.text();
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      const jsonString = text.substring(jsonStart, jsonEnd + 1);
      const data = JSON.parse(jsonString);
      
      // Process the client data
      if (!data.table || !data.table.rows) {
        throw new Error("Invalid client data format");
      }
      
      // Helper function to extract cell value safely - FIX FOR NULL ERROR
      const extractValue = (row, index) => {
        if (!row.c || !row.c[index] || row.c[index].v === undefined || row.c[index].v === null) {
          return "";
        }
        return row.c[index].v.toString().trim();
      };
      
      // Get current user's row
      const userData = user;
      if (!userData) {
        throw new Error("User data not available");
      }
      
      // We need to find the row where the admin is logged in
      // Using the row where the user is found in column C
      let adminRow = null;
      let foundRowIndex = 1; // Default to first data row if not found
  
      // First try to match by email in column C
     for (let i = 0; i < data.table.rows.length; i++) { // Start from 1 to align with spreadsheet row numbering
        const row = data.table.rows[i];
        if (row && row.c) {
          const rowEmail = extractValue(row, 2); // Column C (index 2)
          const currentUserEmail = userData?.email?.toLowerCase();
          
          if (currentUserEmail && rowEmail.toLowerCase() === currentUserEmail) {
            adminRow = row;
            foundRowIndex = i;
            console.log("Found admin by email match in row:", foundRowIndex);
            break;
          }
        }
      }

      // If not found by email, try to match by name/userId
      if (!adminRow && userData?.name) {
        for (let i = 0; i < data.table.rows.length; i++) {
          const row = data.table.rows[i];
          if (row && row.c) {
            const rowValue = extractValue(row, 2); // Column C (index 2)
            
            if (rowValue.toLowerCase() === userData.name.toLowerCase()) {
              adminRow = row;
              foundRowIndex = i;
              console.log("Found admin by name match in row:", foundRowIndex);
              break;
            }
          }
        }
      }

      // If still not found, use the first row with data in column C as fallback
      if (!adminRow) {
        for (let i = 0; i < data.table.rows.length; i++) {
          const row = data.table.rows[i];
          if (row && row.c && row.c[2] && row.c[2].v) {
            adminRow = row;
            foundRowIndex = i;
            console.log("Using fallback row:", foundRowIndex);
            break;
          }
        }
      }
      
      if (!adminRow) {
        throw new Error("Could not find a valid row with admin data");
      }
      
      // Store the admin row index for later use
      // IMPORTANT: Add 1 to match actual spreadsheet row number (because we start from index 1)
      setAdminRowIndex(foundRowIndex + 1);
      
      // Get the authentication value from column G (index 6)
      const authValue = adminRow.c[6] && adminRow.c[6].v !== undefined ? parseFloat(adminRow.c[6].v) : 0;
      console.log("User admin found. Authorization value:", authValue);
      
      // Get admin type from column I (index 8)
      const adminType = extractValue(adminRow, 8);
      console.log("Role value:", adminType);
      
      // Get permissions from column H (index 7)
      const permissionsValue = extractValue(adminRow, 7);
      console.log("Permissions:", permissionsValue);
      
      // Staff list to display in the table
      const staffList = [];
      
      // Add admin information
      staffList.push({
        id: `admin-${foundRowIndex}`,
        username: extractValue(adminRow, 2), // Column C (index 2)
        userId: extractValue(adminRow, 2),
        password: extractValue(adminRow, 3), // Column D (index 3)
        role: adminType === "admin" ? "admin" : "staff",
        staffPosition: "Admin",
        column: "C/D",
        permissions: permissionsValue,
        rowIndex: foundRowIndex
      });
      
      // Process each staff position in order - they'll always be displayed in this order
      staffPositions.forEach((position) => {
        const username = extractValue(adminRow, position.usernameCol);
        const password = extractValue(adminRow, position.passwordCol);
        const staffType = extractValue(adminRow, position.roleCol);
        
        // Add the staff member to the list even if blank (username and password empty)
        // This ensures positions always appear in the same order, with blank ones showing as empty slots
        staffList.push({
          id: `${position.name.toLowerCase().replace(/\s+/g, '')}-${foundRowIndex}`,
          username: username || "",
          userId: username || "",
          password: password || "",
          role: staffType === "admin" ? "admin" : "staff",
          staffPosition: position.name,
          column: position.columns,
          permissions: staffType || "", // Using the role column (S/V/Y) for permissions
          rowIndex: foundRowIndex,
          usernameCol: position.usernameCol,
          passwordCol: position.passwordCol,
          roleCol: position.roleCol,
          isEmpty: !username && !password // Flag to identify empty positions
        });
      });
      
      setStaffMembers(staffList);
      
    } catch (error) {
      console.error("Error fetching staff data:", error);
      setError("Failed to load staff data: " + error.message);
    } finally {
      setIsLoading(false);
    }
  }

  // Function to handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  // Function to handle checkbox changes for permissions
  const handlePermissionChange = (permissionId) => {
    setFormData((prev) => {
      // Check if this is the 'all' permission
      if (permissionId === 'all') {
        // If selecting 'all', add all permission ids
        if (!prev.permissions.includes('all')) {
          return {
            ...prev,
            permissions: ['all']
          };
        } else {
          // If deselecting 'all', clear all permissions
          return {
            ...prev,
            permissions: []
          };
        }
      } else {
        // For regular permissions, toggle them
        // First remove 'all' if it was selected
        let updatedPermissions = prev.permissions.filter(p => p !== 'all');
        
        // Then toggle the specific permission
        if (updatedPermissions.includes(permissionId)) {
          updatedPermissions = updatedPermissions.filter(p => p !== permissionId);
        } else {
          updatedPermissions.push(permissionId);
        }
        
        return {
          ...prev,
          permissions: updatedPermissions
        };
      }
    });
  }

  // Function to handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
  
    // Validate form data
    if (!formData.userId || !formData.password) {
      setError("Please enter both User ID and Password");
      return;
    }
  
    // Check if at least one permission is selected
    if (formData.permissions.length === 0) {
      setError("Please select at least one permission");
      return;
    }
  
    // Check if admin row was found
    if (adminRowIndex === null) {
      setError("Admin row not found. Please refresh the page and try again.");
      return;
    }
  
    try {
      setIsLoading(true);
      setError("");
  
      // Create a unique iframe ID
      const iframeId = `submit-iframe-${Date.now()}`;
  
      // Create a hidden iframe to target the form submission
      const iframe = document.createElement("iframe");
      iframe.name = iframeId;
      iframe.id = iframeId;
      iframe.style.display = "none";
      document.body.appendChild(iframe);
  
      // Use the specific script URL provided
      const scriptUrl =
        "https://script.google.com/macros/s/AKfycbz6-tMsYOC4lbu4XueMyMLccUryF9HkY7HZLC22FB9QeB5NxqCcxedWKS8drwgVwlM/exec";
  
      // Prepare form data for submission
      const formDataToSubmit = new FormData();
  
      // Determine staff position
      let staffPosition = "";
      let targetColumns = "";
      let usernameCol = 0;
      let passwordCol = 0;
      let roleCol = 0;
      
      if (isEditingStaff) {
        // For editing, use the existing position info
        staffPosition = formData.staffPosition;
        
        // Find the position in staffPositions array
        const position = staffPositions.find(pos => pos.name === formData.staffPosition);
        if (!position) {
          throw new Error("Invalid staff position");
        }
        
        usernameCol = position.usernameCol + 1; // +1 because sheet columns are 1-indexed
        passwordCol = position.passwordCol + 1;
        roleCol = position.roleCol + 1;
        targetColumns = position.columns;
      } else {
        // For adding new staff, find the first empty position
        const emptyPosition = staffMembers.find(staff => 
          staff.staffPosition !== "Admin" && 
          (!staff.username || staff.username === "")
        );
        
        if (emptyPosition) {
          // Use the first empty position found
          staffPosition = emptyPosition.staffPosition;
          
          // Find the corresponding position definition
          const position = staffPositions.find(pos => pos.name === staffPosition);
          if (!position) {
            throw new Error("Invalid staff position");
          }
          
          usernameCol = position.usernameCol + 1; // +1 because sheet columns are 1-indexed
          passwordCol = position.passwordCol + 1;
          roleCol = position.roleCol + 1;
          targetColumns = position.columns;
        } else {
          // If no empty positions found
          setError("All staff positions are filled. Delete a staff member first before adding a new one.");
          setIsLoading(false);
          return;
        }
      }
  
      // Convert permissions array to comma-separated string
      const permissionsString = formData.permissions.join(',');
  
      // Create data to submit - we'll use the regular update with rowData
      formDataToSubmit.append("action", "update");
      formDataToSubmit.append("sheetName", "Clients");
      formDataToSubmit.append("rowIndex", adminRowIndex + 1); // +1 because sheet rows are 1-indexed
      
      // Create an empty array for rowData and fill in only specific cells
      const rowData = Array(Math.max(usernameCol, passwordCol, roleCol) + 1).fill('');
      rowData[usernameCol - 1] = formData.userId;     // -1 because arrays are 0-indexed
      rowData[passwordCol - 1] = formData.password;   // -1 because arrays are 0-indexed
      rowData[roleCol - 1] = permissionsString;       // -1 because arrays are 0-indexed
      
      formDataToSubmit.append("rowData", JSON.stringify(rowData));
      formDataToSubmit.append("staffPosition", staffPosition);
  
      // Create a form targeted at the iframe
      const form = document.createElement("form");
      form.method = "POST";
      form.action = scriptUrl;
      form.target = iframeId; // Target the hidden iframe
  
      // Add all form fields from formData
      for (const [key, value] of formDataToSubmit.entries()) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value;
        form.appendChild(input);
      }
  
      // Add form to body, submit it, then remove it
      document.body.appendChild(form);
      form.submit();
  
      // Set up a listener for iframe load completion
      iframe.onload = () => {
        try {
          // Clean up the DOM
          setTimeout(() => {
            document.body.removeChild(form);
            document.body.removeChild(iframe);
          }, 100);
  
          // Show success message
          alert(isEditingStaff ? "Staff updated successfully!" : "Staff added successfully!");
  
          // Reset form and state
          resetForm();
  
          // Refresh the staff list
          fetchStaffMembers();
        } catch (error) {
          console.log("Couldn't access iframe content due to CORS, but form was submitted");
  
          // Even if we can't access the content, the form was submitted
          alert(isEditingStaff ? "Staff updated successfully!" : "Staff added successfully!");
          resetForm();
          fetchStaffMembers();
        } finally {
          setIsLoading(false);
        }
      };
  
      // Add a fallback timeout in case onload doesn't fire
      setTimeout(() => {
        if (isLoading) {
          // Clean up the DOM
          try {
            document.body.removeChild(form);
            document.body.removeChild(iframe);
          } catch (e) {
            console.log("Elements already removed");
          }
  
          alert("Operation completed!");
          resetForm();
          fetchStaffMembers();
          setIsLoading(false);
        }
      }, 5000);
    } catch (error) {
      console.error("Error submitting staff data:", error);
      setError("Failed to save staff data: " + error.message);
      setIsLoading(false);
    }
  }
  
  // Modified staff deletion function - using standard rowData approach
  const handleDeleteStaff = async (staffId, staffPosition, rowIndex) => {
    if (!confirm("Are you sure you want to delete this staff member?")) {
      return;
    }
  
    try {
      setIsLoading(true);
  
      // Skip deleting admin - shouldn't be possible but just in case
      if (staffPosition === "Admin") {
        setError("Cannot delete the admin user");
        setIsLoading(false);
        return;
      }
  
      // Find the position in staffPositions array
      const positionIndex = staffPositions.findIndex(pos => pos.name === staffPosition);
      if (positionIndex === -1) {
        throw new Error("Invalid staff position");
      }
      
      // Get the column indices for this position
      const position = staffPositions[positionIndex];
      const usernameCol = position.usernameCol + 1; // +1 because sheet columns are 1-indexed
      const passwordCol = position.passwordCol + 1;
      const roleCol = position.roleCol + 1;
  
      // Create a unique iframe ID
      const iframeId = `delete-iframe-${Date.now()}`;
  
      // Create a hidden iframe to target the form submission
      const iframe = document.createElement("iframe");
      iframe.name = iframeId;
      iframe.id = iframeId;
      iframe.style.display = "none";
      document.body.appendChild(iframe);
  
      // Use the specific script URL provided
      const scriptUrl =
        "https://script.google.com/macros/s/AKfycbz6-tMsYOC4lbu4XueMyMLccUryF9HkY7HZLC22FB9QeB5NxqCcxedWKS8drwgVwlM/exec";
  
      // Prepare form data for submission - we'll clear the staff cells
      const formDataToSubmit = new FormData();
  
      // We're using update with rowData
      formDataToSubmit.append("action", "update");
      formDataToSubmit.append("sheetName", "Clients");
      formDataToSubmit.append("rowIndex", adminRowIndex + 1); // +1 because sheet rows are 1-indexed
      
      // Create an empty array for rowData and fill in only specific cells with empty values
      const rowData = Array(Math.max(usernameCol, passwordCol, roleCol) + 1).fill('');
      rowData[usernameCol - 1] = ''; // -1 because arrays are 0-indexed
      rowData[passwordCol - 1] = ''; // -1 because arrays are 0-indexed
      rowData[roleCol - 1] = '';     // -1 because arrays are 0-indexed
      
      formDataToSubmit.append("rowData", JSON.stringify(rowData));
      formDataToSubmit.append("staffPosition", staffPosition);
  
      // Create a form targeted at the iframe
      const form = document.createElement("form");
      form.method = "POST";
      form.action = scriptUrl;
      form.target = iframeId; // Target the hidden iframe
  
      // Add all form fields from formData
      for (const [key, value] of formDataToSubmit.entries()) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value;
        form.appendChild(input);
      }
  
      // Add form to body, submit it, then remove it
      document.body.appendChild(form);
      form.submit();
  
      // Set up a listener for iframe load completion
      iframe.onload = () => {
        try {
          // Clean up the DOM
          setTimeout(() => {
            document.body.removeChild(form);
            document.body.removeChild(iframe);
          }, 100);
  
          // Show success message
          alert("Staff member deleted successfully!");
  
          // Refresh the staff list
          fetchStaffMembers();
        } catch (error) {
          console.log("Couldn't access iframe content due to CORS, but form was submitted");
  
          // Even if we can't access the content, the form was submitted
          alert("Staff member deleted successfully!");
          fetchStaffMembers();
        } finally {
          setIsLoading(false);
        }
      };
  
      // Add a fallback timeout in case onload doesn't fire
      setTimeout(() => {
        if (isLoading) {
          // Clean up the DOM
          try {
            document.body.removeChild(form);
            document.body.removeChild(iframe);
          } catch (e) {
            console.log("Elements already removed");
          }
  
          alert("Staff member deleted!");
          fetchStaffMembers();
          setIsLoading(false);
        }
      }, 5000);
    } catch (error) {
      console.error("Error deleting staff member:", error);
      setError("Failed to delete staff member: " + error.message);
      setIsLoading(false);
    }
  }

  // Function to edit a staff member
  const handleEditStaff = (staff) => {
    // Parse permissions from the string if it exists
    let permissions = [];
    if (staff.permissions) {
      // Check if it's already an array
      if (Array.isArray(staff.permissions)) {
        permissions = staff.permissions;
      } else {
        // Parse from comma-separated string
        permissions = staff.permissions.split(',').map(p => p.trim().toLowerCase());
      }
    }

    setFormData({
      id: staff.id,
      userId: staff.userId,
      password: staff.password,
      role: staff.role || "staff",
      permissions: permissions,
      staffPosition: staff.staffPosition,
      column: staff.column,
      rowIndex: staff.rowIndex,
      usernameCol: staff.usernameCol,
      passwordCol: staff.passwordCol,
      roleCol: staff.roleCol
    });
    setIsEditingStaff(true);
    setIsAddingStaff(true);
  }

  // Function to reset the form
  const resetForm = () => {
    setFormData({
      id: "",
      userId: "",
      password: "",
      role: "staff",
      permissions: []
    });
    setIsAddingStaff(false);
    setIsEditingStaff(false);
    setShowPassword(false);
  }

  // Filter staff members based on search query
  // Filter staff members based on search query and non-empty values
  const filteredStaffMembers = staffMembers.filter((staff) => {
    // Only show rows with non-empty username and userId
    const hasValidData = staff.username && staff.username.trim() !== '' && 
                         staff.userId && staff.userId.trim() !== '';
    
    // If no search query, just return rows with valid data
    if (!searchQuery) return hasValidData;

    // If search query exists, apply additional filtering
    const query = searchQuery.toLowerCase();
    return hasValidData && (
      staff.username.toLowerCase().includes(query) ||
      staff.userId.toLowerCase().includes(query) ||
      staff.role.toLowerCase().includes(query) ||
      staff.staffPosition.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col items-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-lg transform rotate-6"></div>
              <div className="absolute inset-0 bg-white rounded-lg flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-indigo-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M17 21V19C17 16.7909 15.2091 15 13 15H5C2.79086 15 1 16.7909 1 19V21"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M23 21V19C22.9986 17.1771 21.7079 15.5857 19.91 15.13"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M16 3.13C17.8025 3.58425 19.0967 5.17565 19.0967 7.005C19.0967 8.83435 17.8025 10.4258 16 10.88"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
            <h1 className="ml-4 text-3xl font-extrabold text-white">
              Staff <span className="text-indigo-300">Management</span>
            </h1>
          </div>
          <p className="text-indigo-200 text-center max-w-2xl">
            Add, edit, and manage staff members and their login credentials
          </p>
        </div>

        {/* Navigation and Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-8 bg-white/10 backdrop-blur-lg rounded-xl p-4">
          <button
            onClick={() => navigate("/profile")}
            className="flex items-center text-white hover:text-indigo-200 transition-colors mb-4 sm:mb-0"
          >
            <ArrowLeft size={20} className="mr-1" />
            <span>Back to Profile</span>
          </button>

          <button
            onClick={() => {
              setIsAddingStaff(true);
              setIsEditingStaff(false);
              setFormData({
                id: "",
                userId: "",
                password: "",
                role: "staff",
                permissions: []
              });
            }}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-indigo-500/30"
          >
            <Plus size={18} className="inline mr-2" />
            Add New Staff
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-indigo-300" />
            </div>
            <input
              type="text"
              placeholder="Search staff by name, ID, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/10 border border-indigo-300/30 rounded-lg text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-white flex items-start">
            <AlertCircle size={18} className="mr-2 flex-shrink-0 mt-0.5 text-red-300" />
            <span>{error}</span>
          </div>
        )}

        {/* Add/Edit Staff Form */}
        {isAddingStaff && (
          <div className="mb-8 bg-white/10 backdrop-blur-lg rounded-2xl overflow-hidden shadow-xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">
                  {isEditingStaff ? `Edit ${formData.staffPosition || 'Staff Member'}` : "Add New Staff Member"}
                </h3>
                <button onClick={resetForm} className="text-indigo-300 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* User ID as a dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-indigo-200 mb-2">
                      User ID <span className="text-red-400">*</span>
                    </label>
                    <select
                      name="userId"
                      value={formData.userId}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white/5 border border-indigo-300/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      <option value="">Select User ID</option>
                      {availableUserIds.map((id) => (
                        <option key={id} value={id}>
                          {id}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-indigo-200 mb-2">
                      Password <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Enter password"
                        className="w-full px-4 py-3 bg-white/5 border border-indigo-300/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-indigo-300 hover:text-white"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Permissions Section */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-indigo-200 mb-4">
                    Permissions <span className="text-red-400">*</span>
                  </label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {availablePermissions.map((permission) => (
                      <div key={permission.id} className="flex items-center">
                        <button
                          type="button"
                          onClick={() => handlePermissionChange(permission.id)}
                          className={`flex items-center p-2 rounded-md w-full transition-colors ${
                            formData.permissions.includes(permission.id)
                              ? "bg-indigo-600/50 text-white border border-indigo-400"
                              : "bg-white/5 text-indigo-200 border border-indigo-300/30 hover:bg-white/10"
                          }`}
                        >
                          <div className={`w-5 h-5 rounded flex items-center justify-center mr-2 ${
                            formData.permissions.includes(permission.id)
                              ? "bg-indigo-500 text-white"
                              : "bg-white/10"
                          }`}>
                            {formData.permissions.includes(permission.id) && <Check size={14} />}
                          </div>
                          <span className="text-sm">{permission.label}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <p className="text-xs text-indigo-300/70 mt-2">
                    {formData.permissions.includes('all') 
                      ? "All permissions selected - this user will have full access"
                      : `Selected permissions: ${formData.permissions.length}`}
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-indigo-300/30 text-white rounded-lg hover:bg-white/10 transition-colors mr-3"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-indigo-500/30"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="h-5 w-5 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2 inline-block"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={16} className="inline mr-2" />
                        {isEditingStaff ? "Update Staff" : "Add Staff"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Staff List */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl overflow-hidden shadow-xl">
          <div className="p-6">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
              <User size={20} className="mr-2 text-indigo-300" />
              Staff Members
            </h3>

            {isLoading && !isAddingStaff ? (
              <div className="flex justify-center items-center py-12">
                <div className="h-8 w-8 border-t-2 border-b-2 border-indigo-300 rounded-full animate-spin"></div>
                <span className="ml-3 text-indigo-200">Loading staff data...</span>
              </div>
            ) : filteredStaffMembers.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-500/20 mb-4">
                  <User size={32} className="text-indigo-300" />
                </div>
                <p className="text-indigo-200 text-lg">
                  {searchQuery ? "No staff members match your search" : "No staff members found"}
                </p>
                <button
                  onClick={() => {
                    setIsAddingStaff(true);
                    setIsEditingStaff(false);
                  }}
                  className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Plus size={18} className="inline mr-2" />
                  Add Your First Staff Member
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-indigo-300/30">
                      <th className="pb-3 text-indigo-200 font-medium">User ID</th>
                      <th className="pb-3 text-indigo-200 font-medium">Password</th>
                      <th className="pb-3 text-indigo-200 font-medium">Role</th>
                      <th className="pb-3 text-indigo-200 font-medium">Position</th>
                      {/* <th className="pb-3 text-indigo-200 font-medium">Columns</th> */}
                      <th className="pb-3 text-indigo-200 font-medium">Permissions</th>
                      <th className="pb-3 text-indigo-200 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStaffMembers.map((staff) => (
                      <tr key={staff.id} className="border-b border-indigo-300/10 hover:bg-white/5">
                        <td className="py-4 text-white">{staff.userId}</td>
                        <td className="py-4 text-white">
                          <span className="flex items-center">
                            <span className="mr-2">••••••••</span>
                          </span>
                        </td>
                        <td className="py-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              staff.role === "admin"
                                ? "bg-purple-500/30 text-purple-200"
                                : "bg-green-500/30 text-green-200"
                            }`}
                          >
                            {staff.role || "Staff"}
                          </span>
                        </td>
                        <td className="py-4 text-white">{staff.staffPosition}</td>
                        {/* <td className="py-4 text-white">{staff.column}</td> */}
                        <td className="py-4 text-white">
                          {staff.permissions && typeof staff.permissions === 'string' ? (
                            <div className="flex flex-wrap gap-1">
                              {staff.permissions.split(',').map((perm, idx) => (
                                <span key={idx} 
                                  className="px-1.5 py-0.5 text-xs rounded-md bg-indigo-500/20 text-indigo-200 truncate max-w-[100px]">
                                  {perm.trim()}
                                </span>
                              ))}
                            </div>
                          ) : (
                            "None"
                          )}
                        </td>
                        <td className="py-4">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditStaff(staff)}
                              className="p-1.5 bg-indigo-500/20 text-indigo-200 rounded-md hover:bg-indigo-500/40 transition-colors"
                              title="Edit"
                            >
                              <Edit3 size={16} />
                            </button>
                            {/* <button
                              onClick={() => handleDeleteStaff(staff.id, staff.staffPosition, staff.rowIndex)}
                              className="p-1.5 bg-red-500/20 text-red-200 rounded-md hover:bg-red-500/40 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button> */}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center justify-center">
            <div className="h-px w-16 bg-indigo-300/30"></div>
            <span className="mx-4 text-indigo-200 text-sm">Powered by Botivate</span>
            <div className="h-px w-16 bg-indigo-300/30"></div>
          </div>
          <p className="mt-4 text-indigo-300/60 text-sm">© 2025 SalonPro. All rights reserved.</p>
        </div>
      </div>

      {/* Add CSS for animations */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes blob {
            0% {
              transform: translate(0px, 0px) scale(1);
            }
            33% {
              transform: translate(30px, -50px) scale(1.1);
            }
            66% {
              transform: translate(-20px, 20px) scale(0.9);
            }
            100% {
              transform: translate(0px, 0px) scale(1);
            }
          }
          .animate-blob {
            animation: blob 7s infinite;
          }
          .animation-delay-2000 {
            animation-delay: 2s;
          }
          .animation-delay-4000 {
            animation-delay: 4s;
          }
        `,
        }}
      ></style>
    </div>
  )
}

export default StaffUser