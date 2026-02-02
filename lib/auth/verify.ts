import { NextRequest } from 'next/server';
import { verifyToken } from './jwt';

export async function verifyAuth(request: NextRequest) {
  try {
    // Try to get token from cookie first, then from Authorization header
    let token = request.cookies.get('token')?.value;
    
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return null;
    }

    const payload = await verifyToken(token);

    if (!payload) {
      return null;
    }

    // Return the basic info from token
    return {
      userId: payload.userId as number,
      email: payload.email as string,
      isAdmin: payload.isAdmin as boolean,
      name: payload.name as string,
      username: payload.username as string,
      avatar: payload.avatar as string,
    };
  } catch (error) {
    console.error('Auth verification error:', error);
    return null;
  }
}
