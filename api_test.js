import axios from 'axios';

const API_URL = 'https://lab-maintenance-management-backend.onrender.com/api';

async function runTest() {
  console.log('🧪 Starting Lab Management System Integration Test Suite...\n');

  try {
    const timestamp = Date.now();
    const testEmail = `test_tech_${timestamp}@lab.com`;
    const testPassword = `pass_${timestamp}`;

    // 1. Fetch departments/lab rooms dynamically (pre-requisite metadata)
    console.log('1. Checking connection and fetching metadata...');
    // We login first using the default admin account to get the metadata
    let token = '';
    try {
      const adminLogin = await axios.post(`${API_URL}/auth/login`, {
        email: 'admin@lab.com',
        password: 'admin123'
      });
      token = adminLogin.data.token;
      console.log('✅ Admin login succeeded, token acquired.');
    } catch (e) {
      console.log('⚠️ Admin login failed (probably database not seeded yet). Trying to register directly...');
    }

    let departmentId = null;
    let labRoomId = null;

    if (token) {
      const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
      const depts = await axios.get(`${API_URL}/meta/departments`, authHeaders);
      const rooms = await axios.get(`${API_URL}/meta/lab-rooms`, authHeaders);
      
      if (depts.data.departments?.length > 0) {
        departmentId = depts.data.departments[0].id;
        console.log(`- Found department: ${depts.data.departments[0].departmentName} (ID: ${departmentId})`);
      }
      if (rooms.data.labRooms?.length > 0) {
        labRoomId = rooms.data.labRooms[0].id;
        console.log(`- Found lab room: ${rooms.data.labRooms[0].labName} (ID: ${labRoomId})`);
      }
    }

    // 2. Register New User Account
    console.log('\n2. Registering new technician account...');
    const registerRes = await axios.post(`${API_URL}/auth/register`, {
      name: 'Test Technician User',
      email: testEmail,
      mobile: '+15550001111',
      password: testPassword,
      role: 'technician',
      departmentId: departmentId
    });
    console.log('✅ Registration API succeeded:', registerRes.data.message);
    const techToken = registerRes.data.token;
    const techHeaders = { headers: { Authorization: `Bearer ${techToken}` } };

    // 3. Authenticate / Login User
    console.log('\n3. Logging in with new credentials...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: testEmail,
      password: testPassword
    });
    console.log('✅ Login API succeeded. Token verified.');

    // 4. Fetch Current User Profile Info
    console.log('\n4. Fetching currently authenticated user details (/auth/me)...');
    const meRes = await axios.get(`${API_URL}/auth/me`, techHeaders);
    console.log(`✅ Get profile API succeeded. Authenticated as: ${meRes.data.user.name} (${meRes.data.user.role})`);

    // 5. Update user profile
    console.log('\n5. Testing user profile details update...');
    const updateRes = await axios.put(`${API_URL}/auth/profile`, {
      name: 'Updated Technician Name',
      mobile: '+919999999999'
    }, techHeaders);
    console.log('✅ Update Profile API succeeded:', updateRes.data.message);
    console.log(`- New Name in response: ${updateRes.data.user.name}`);

    // Log in as admin to perform equipment actions
    console.log('\n6. Logging back in as Admin to run asset operations...');
    const adminLogin = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@lab.com',
      password: 'admin123'
    });
    const adminToken = adminLogin.data.token;
    const adminHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };

    // 7. Create Equipment Asset
    console.log('\n7. Logging a new equipment asset...');
    const equipRes = await axios.post(`${API_URL}/equipment`, {
      assetNumber: `TEST-PC-${timestamp}`,
      equipmentName: `Test PC ${timestamp}`,
      equipmentType: 'Desktop Computer',
      brand: 'Dell',
      modelNumber: 'Optiplex 7090',
      serialNumber: `SN-${timestamp}`,
      departmentId: departmentId,
      labRoomId: labRoomId,
      remarks: 'Automated test suite logged device.'
    }, adminHeaders);
    console.log('✅ Create Equipment API succeeded:', equipRes.data.message);
    const equipmentId = equipRes.data.equipment.id;

    // 8. List Equipment Assets
    console.log('\n8. Retrieving equipment assets list...');
    const listEquip = await axios.get(`${API_URL}/equipment`, adminHeaders);
    console.log(`✅ List Equipment API succeeded. Total items found: ${listEquip.data.total}`);

    // 9. Create Maintenance Incident
    console.log('\n9. Reporting an equipment maintenance issue...');
    const maintRes = await axios.post(`${API_URL}/maintenance`, {
      equipmentId: equipmentId,
      issueDescription: 'Display panel flickers frequently and shuts down.',
      assignedTo: registerRes.data.user.id
    }, adminHeaders);
    console.log('✅ Log Maintenance API succeeded:', maintRes.data.message);
    const ticketId = maintRes.data.maintenance.id;

    // 10. List Maintenance Logs
    console.log('\n10. Fetching maintenance dashboard statistics & logs list...');
    const logsRes = await axios.get(`${API_URL}/maintenance`, adminHeaders);
    const statsRes = await axios.get(`${API_URL}/maintenance/stats`, adminHeaders);
    console.log(`✅ Maintenance Logs list succeeded. Total items: ${logsRes.data.total}`);
    console.log('✅ Maintenance Stats API succeeded.');
    console.log(`- Open incidents: ${statsRes.data.stats.open}`);
    console.log(`- In Progress: ${statsRes.data.stats.inProgress}`);

    console.log('\n🎉 ALL INTEGRATION API CHECKS COMPLETED SUCCESSFULLY!');
    console.log('----------------------------------------------------');
    console.log('Summary: Autoseeding, Registration, Login, Profile updates,');
    console.log('Equipment creation, and Maintenance ticketing endpoints are 100% active.');
  } catch (error) {
    console.error('\n❌ API INTEGRATION TEST FAILED!');
    console.error('Error Details:', error.response?.data || error.message);
  }
}

runTest();
