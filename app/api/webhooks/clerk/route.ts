import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/mongodb';
import { User, UserRole } from '@/backend/models';

export async function POST(req: Request) {
  // You can find this in the Clerk Dashboard -> Webhooks -> choose the webhook
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env');
  }

  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occurred -- no svix headers', {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occurred', {
      status: 400,
    });
  }

  // Handle the webhook
  const eventType = evt.type;

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;

    const email = email_addresses[0]?.email_address;
    const name = `${first_name || ''} ${last_name || ''}`.trim() || email;

    try {
      await connectDB();

      // Create user in MongoDB
      const user = await User.create({
        clerkId: id,
        email,
        name,
        role: UserRole.VIEWER, // Default role
        avatar: image_url,
      });

      console.log(`Created user from webhook: ${user.email}`);

      return Response.json({ success: true, userId: user._id });
    } catch (error) {
      console.error('Error creating user from webhook:', error);
      return new Response('Error creating user', { status: 500 });
    }
  }

  if (eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;

    const email = email_addresses[0]?.email_address;
    const name = `${first_name || ''} ${last_name || ''}`.trim() || email;

    try {
      await connectDB();

      // Update user in MongoDB
      const user = await User.findOne({ clerkId: id });

      if (user) {
        user.email = email;
        user.name = name;
        user.avatar = image_url;
        await user.save();

        console.log(`Updated user from webhook: ${user.email}`);
      } else {
        // User doesn't exist, create it
        await User.create({
          clerkId: id,
          email,
          name,
          role: UserRole.VIEWER,
          avatar: image_url,
        });

        console.log(`Created user from webhook (via update): ${email}`);
      }

      return Response.json({ success: true });
    } catch (error) {
      console.error('Error updating user from webhook:', error);
      return new Response('Error updating user', { status: 500 });
    }
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data;

    try {
      await connectDB();

      // Optionally soft-delete or hard-delete user
      // For now, we'll just log it and not delete from our DB
      console.log(`User deleted in Clerk: ${id}`);

      // If you want to delete from MongoDB:
      // await User.deleteOne({ clerkId: id });

      return Response.json({ success: true });
    } catch (error) {
      console.error('Error handling user deletion webhook:', error);
      return new Response('Error handling deletion', { status: 500 });
    }
  }

  return Response.json({ success: true });
}
