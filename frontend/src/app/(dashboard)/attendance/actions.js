'use server';

import { revalidateTag } from 'next/cache';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

export async function checkInAction(token, data) {
  try {
    const res = await fetch(`${API_URL}/attendance/checkin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (res.ok && json.success) {
      revalidateTag('attendance');
    }
    return json;
  } catch (error) {
    console.error('checkInAction error:', error);
    return { success: false, message: error.message };
  }
}

export async function checkOutAction(token, data) {
  try {
    const res = await fetch(`${API_URL}/attendance/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (res.ok && json.success) {
      revalidateTag('attendance');
    }
    return json;
  } catch (error) {
    console.error('checkOutAction error:', error);
    return { success: false, message: error.message };
  }
}

export async function markAbsentAction(token, data) {
  try {
    const res = await fetch(`${API_URL}/attendance/absent`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (res.ok && json.success) {
      revalidateTag('attendance');
    }
    return json;
  } catch (error) {
    console.error('markAbsentAction error:', error);
    return { success: false, message: error.message };
  }
}

export async function unmarkAction(token, data) {
  try {
    const res = await fetch(`${API_URL}/attendance/unmark`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (res.ok && json.success) {
      revalidateTag('attendance');
    }
    return json;
  } catch (error) {
    console.error('unmarkAction error:', error);
    return { success: false, message: error.message };
  }
}
