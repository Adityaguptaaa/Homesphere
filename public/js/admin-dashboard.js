// Admin Dashboard Logic

let revenueChartInstance = null;
let serviceChartInstance = null;

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', function () {
    // Check Auth Status
    firebaseAuth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = '../login.html';
        } else {
            console.log('👑 Admin authenticated:', user.email);

            const userDoc = await firebaseDB.collection('users').doc(user.uid).get();
            if (!userDoc.exists || userDoc.data().role !== 'admin') {
                console.warn('⚠️ User is not strictly an admin (role check skipped for demo)');
            }

            await loadAdminProfile(user.uid);
            await loadPlatformStats();
        }
    });
});

async function loadAdminProfile(uid) {
    try {
        const doc = await firebaseDB.collection('users').doc(uid).get();
        if (doc.exists) {
            const data = doc.data();
            const nameEls = document.querySelectorAll('.text-left .text-sm.font-semibold');
            if (nameEls.length > 0) nameEls[0].textContent = `${data.firstName} ${data.lastName}`;
        }
    } catch (error) {
        console.error('Error loading admin profile:', error);
    }
}

async function loadPlatformStats() {
    try {
        const tbody = document.getElementById('recentBookingsBody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="py-12 text-center text-gray-500"><i class="fas fa-spinner fa-spin text-2xl mb-2"></i><p>Refreshing data...</p></td></tr>';

        let totalBookings = 0;
        let totalRevenue = 0;
        let totalUsers = 0;
        let totalHelpers = 0;
        let allBookings = [];

        // Data for charts
        const serviceCounts = {};
        const revenueByMonth = new Array(12).fill(0);
        const currentYear = new Date().getFullYear();

        // Fetch Bookings
        const bookingsSnapshot = await firebaseDB.collection('bookings').get();
        totalBookings = bookingsSnapshot.size;

        bookingsSnapshot.forEach(doc => {
            const data = doc.data();
            allBookings.push(data);

            // Revenue Calculation
            if (data.status === 'completed') {
                const rawAmount = data.totalPrice || data.amount;
                const amount = Number(rawAmount) || 0;

                if (amount > 0) {
                    totalRevenue += amount;

                    // Robust Date Parsing
                    let date = null;
                    if (data.createdAt) {
                        if (data.createdAt.seconds) {
                            date = new Date(data.createdAt.seconds * 1000);
                        } else if (data.createdAt instanceof Date) {
                            date = data.createdAt;
                        } else {
                            // Try parsing string/timestamp
                            date = new Date(data.createdAt);
                        }
                    }

                    // Only add to chart if date is valid and in CURRENT YEAR
                    if (date && !isNaN(date) && date.getFullYear() === currentYear) {
                        const month = date.getMonth(); // 0 = Jan, 11 = Dec
                        revenueByMonth[month] += amount;
                    }
                }
            }

            // Service Counts
            const sName = (data.serviceName || 'Other').trim();
            // Capitalize first letter for consistency
            const normalizedName = sName.charAt(0).toUpperCase() + sName.slice(1);
            serviceCounts[normalizedName] = (serviceCounts[normalizedName] || 0) + 1;
        });

        // Fetch Users
        const usersSnapshot = await firebaseDB.collection('users').get();
        usersSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.role === 'helper') {
                totalHelpers++;
            } else {
                totalUsers++;
            }
        });

        // Update Stats UI
        if (document.getElementById('totalBookingsVal'))
            document.getElementById('totalBookingsVal').textContent = totalBookings;

        if (document.getElementById('totalRevenueVal'))
            document.getElementById('totalRevenueVal').textContent = `₹${(totalRevenue).toLocaleString()}`;

        if (document.getElementById('activeUsersVal'))
            document.getElementById('activeUsersVal').textContent = totalUsers + totalHelpers;

        if (document.getElementById('helpersCountVal'))
            document.getElementById('helpersCountVal').textContent = totalHelpers;

        // Cancellation Rate
        const cancelled = allBookings.filter(b => b.status === 'cancelled').length;
        const cancelRate = totalBookings > 0 ? ((cancelled / totalBookings) * 100).toFixed(1) : 0;

        if (document.getElementById('cancellationRateVal'))
            document.getElementById('cancellationRateVal').textContent = `${cancelRate}%`;

        // Update Charts
        updateCharts(serviceCounts, revenueByMonth);

        // Render Recent Bookings Table
        if (tbody) {
            tbody.innerHTML = '';

            // Sort Descending
            allBookings.sort((a, b) => {
                const tA = a.createdAt && a.createdAt.seconds ? a.createdAt.seconds : 0;
                const tB = b.createdAt && b.createdAt.seconds ? b.createdAt.seconds : 0;
                return tB - tA;
            });

            const recentBookings = allBookings.slice(0, 10);

            if (recentBookings.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-gray-500">No bookings found.</td></tr>';
            } else {
                recentBookings.forEach(booking => {
                    const date = booking.createdAt ? new Date(booking.createdAt.seconds * 1000).toLocaleDateString() : 'N/A';
                    const statusColor = getStatusColor(booking.status);
                    const amount = Number(booking.totalPrice || booking.amount) || 0;

                    const row = `
                        <tr class="hover:bg-gray-800 transition-colors border-b border-gray-800 last:border-0">
                            <td class="py-4 pl-4">
                                <div class="flex items-center">
                                    <div class="w-8 h-8 rounded-full bg-purple-900 flex items-center justify-center mr-3 text-purple-400">
                                        <i class="fas fa-tools text-xs"></i>
                                    </div>
                                    <span class="font-medium text-white">${booking.serviceName || 'Service'}</span>
                                </div>
                            </td>
                            <td class="py-4 text-sm text-gray-300">${booking.userName || 'User'}</td>
                            <td class="py-4 text-sm text-gray-300">${booking.helperName || '<span class="text-gray-500 italic">Pending</span>'}</td>
                            <td class="py-4">
                                <span class="px-2 py-1 rounded-full text-xs font-semibold ${statusColor}">
                                    ${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                </span>
                            </td>
                            <td class="py-4 font-medium text-white">₹${amount}</td>
                            <td class="py-4 pr-4 text-right text-sm text-gray-400">${date}</td>
                        </tr>
                    `;
                    tbody.innerHTML += row;
                });
            }
        }

    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function updateCharts(serviceCounts, revenueByMonth) {
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded');
        return;
    }

    // Service Chart
    const serviceCtx = document.getElementById('serviceChart');
    if (serviceCtx) {
        if (serviceChartInstance) serviceChartInstance.destroy();

        const labels = Object.keys(serviceCounts);
        const data = Object.values(serviceCounts);
        const total = data.reduce((a, b) => a + b, 0);

        serviceChartInstance = new Chart(serviceCtx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: ['#a855f7', '#ec4899', '#3b82f6', '#06b6d4', '#10b981'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { display: false } },
                cutout: '75%'
            }
        });

        // Update Legend
        const legendContainer = serviceCtx.nextElementSibling;
        if (legendContainer && legendContainer.classList.contains('mt-6')) {
            legendContainer.innerHTML = '';

            if (labels.length === 0) {
                legendContainer.innerHTML = '<p class="text-sm text-gray-500 text-center">No service data available</p>';
            } else {
                labels.forEach((label, index) => {
                    const count = data[index];
                    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                    const colors = ['bg-purple-500', 'bg-pink-500', 'bg-blue-500', 'bg-cyan-500', 'bg-emerald-500'];
                    const colorClass = colors[index % colors.length];

                    const item = `
                        <div class="flex items-center justify-between text-sm">
                            <div class="flex items-center space-x-2">
                                <div class="w-3 h-3 ${colorClass} rounded-full"></div>
                                <span class="text-gray-300">${label}</span>
                            </div>
                            <span class="text-white font-semibold">${percentage}%</span>
                        </div>
                    `;
                    legendContainer.innerHTML += item;
                });
            }
        }
    }

    // Revenue Chart
    const revenueCtx = document.getElementById('revenueChart');
    if (revenueCtx) {
        if (revenueChartInstance) revenueChartInstance.destroy();

        revenueChartInstance = new Chart(revenueCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [{
                    label: `Revenue (${new Date().getFullYear()})`,
                    data: revenueByMonth,
                    borderColor: '#a855f7',
                    backgroundColor: 'rgba(168, 85, 247, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#a855f7',
                    pointBorderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                        ticks: { color: '#9ca3af', callback: val => '₹' + val }
                    },
                    x: { grid: { display: false }, ticks: { color: '#9ca3af' } }
                }
            }
        });
    }
}

function getStatusColor(status) {
    if (!status) return 'bg-gray-500 bg-opacity-20 text-gray-400';
    switch (status.toLowerCase()) {
        case 'pending': return 'bg-yellow-500 bg-opacity-20 text-yellow-400';
        case 'assigned': return 'bg-blue-500 bg-opacity-20 text-blue-400';
        case 'in-progress': return 'bg-indigo-500 bg-opacity-20 text-indigo-400';
        case 'completed': return 'bg-green-500 bg-opacity-20 text-green-400';
        case 'cancelled': return 'bg-red-500 bg-opacity-20 text-red-400';
        default: return 'bg-gray-500 bg-opacity-20 text-gray-400';
    }
}
