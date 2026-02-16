"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔹 Get Logged In User
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = "/";
      } else {
        setUser(session.user);
        fetchBookmarks(session.user.id);
      }

      setLoading(false);
    };

    getUser();
  }, []);

  // 🔹 Fetch Bookmarks
  const fetchBookmarks = async (userId?: string) => {
    const id = userId || user?.id;
    if (!id) return;

    const { data, error } = await supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setBookmarks(data);
    }
  };

  // 🔹 Add Bookmark
  const addBookmark = async () => {
    if (!title || !url) return alert("Please fill all fields");

    const { error } = await supabase.from("bookmarks").insert({
      title,
      url,
      user_id: user.id,
    });

    if (error) {
      console.log(error);
      alert("Error adding bookmark");
    } else {
      setTitle("");
      setUrl("");
      fetchBookmarks();
    }
  };

  // 🔹 Delete Bookmark
  const deleteBookmark = async (id: string) => {
    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("id", id);

    if (error) {
      console.log(error);
      alert("Error deleting bookmark");
    } else {
      fetchBookmarks();
    }
  };

  // 🔹 Realtime Subscription
  useEffect(() => {
    const channel = supabase
      .channel("bookmarks-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookmarks" },
        () => {
          fetchBookmarks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // 🔹 Logout
  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (loading) return <p className="p-8">Loading...</p>;

  return (
    <div className="p-8 max-w-xl mx-auto">

      {/* Header */}
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button
          onClick={logout}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          Logout
        </button>
      </div>

      {/* User Info */}
      {user && (
        <p className="mb-4 text-gray-700">
          Logged in as: {user.email}
        </p>
      )}

      {/* Add Bookmark Form */}
      <div className="bg-white shadow p-4 rounded space-y-3">

        <input
          type="text"
          placeholder="Bookmark Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border w-full p-2 rounded"
        />

        <input
          type="text"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="border w-full p-2 rounded"
        />

        <button
          onClick={addBookmark}
          className="bg-blue-500 text-white px-4 py-2 rounded w-full"
        >
          Add Bookmark
        </button>

      </div>

      {/* Bookmark List */}
      <div className="mt-6 space-y-3">

        {bookmarks.length === 0 && (
          <p className="text-gray-500">No bookmarks yet</p>
        )}

        {bookmarks.map((bookmark) => (
          <div
            key={bookmark.id}
            className="flex justify-between items-center bg-gray-100 p-3 rounded"
          >
            <div>
              <p className="font-semibold">{bookmark.title}</p>
              <a
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 text-sm"
              >
                {bookmark.url}
              </a>
            </div>

            <button
              onClick={() => deleteBookmark(bookmark.id)}
              className="bg-red-500 text-white px-3 py-1 rounded"
            >
              Delete
            </button>
          </div>
        ))}

      </div>

    </div>
  );
}
