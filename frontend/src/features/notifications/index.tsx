import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, message, post } from "../../api";

type Notification = {
  id: string;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
  entity_type?: string;
  entity_id?: string;
};

export function Notifications() {
  const queryClient = useQueryClient();
  const query = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: () => get<Notification[]>("/notifications"),
  });
  const markRead = useMutation({
    mutationFn: (id: string) => post(`/notifications/${id}/read`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const markAll = useMutation({
    mutationFn: () => post("/notifications/read-all"),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
  if (query.isPending)
    return (
      <section>
        <p role="status">Loading notifications...</p>
      </section>
    );
  if (query.isError)
    return (
      <section>
        <h1>Notifications</h1>
        <p role="alert">{message(query.error)}</p>
      </section>
    );
  return (
    <section>
      <div className="title">
        <h1>Notifications</h1>
        <button onClick={() => markAll.mutate()} disabled={markAll.isPending}>
          Mark all read
        </button>
      </div>
      {query.data?.length ? (
        <ul className="records">
          {query.data.map((n) => (
            <li key={n.id}>
              <strong>{n.title}</strong>
              <small>{n.message}</small>
              {!n.read_at && (
                <button
                  onClick={() => markRead.mutate(n.id)}
                  disabled={markRead.isPending}
                >
                  Mark read
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>No notifications.</p>
      )}
    </section>
  );
}
