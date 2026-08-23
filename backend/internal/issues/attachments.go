package issues

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"github.com/winatabayu00/school-success-platform/backend/pkg/config"
	"gorm.io/gorm"
)

const maxAttachmentBytes = 10 << 20

var ErrInvalidAttachment = errors.New("invalid attachment")

type Attachment struct {
	ID          string    `json:"id"`
	IssueID     string    `json:"issue_id"`
	Filename    string    `json:"filename"`
	ContentType string    `json:"content_type"`
	SizeBytes   int64     `json:"size_bytes"`
	UploadedBy  string    `json:"uploaded_by"`
	CreatedAt   time.Time `json:"created_at"`
	ObjectKey   string    `json:"-" gorm:"column:object_key"`
}

type ObjectStore struct {
	client *minio.Client
	bucket string
}

func NewObjectStore(cfg config.Config) (*ObjectStore, error) {
	client, err := minio.New(cfg.MinIOEndpoint, &minio.Options{Creds: credentials.NewStaticV4(cfg.MinIOAccessKey, cfg.MinIOSecretKey, ""), Secure: false})
	if err != nil {
		return nil, err
	}
	store := &ObjectStore{client: client, bucket: cfg.MinIOBucket}
	exists, err := client.BucketExists(context.Background(), store.bucket)
	if err != nil {
		return nil, err
	}
	if !exists {
		if err := client.MakeBucket(context.Background(), store.bucket, minio.MakeBucketOptions{}); err != nil {
			return nil, err
		}
	}
	return store, nil
}

func attachmentKey(issueID string) string {
	return fmt.Sprintf("issues/%s/%s", issueID, uuid.NewString())
}
func validAttachment(contentType string, size int64) bool {
	return size > 0 && size <= maxAttachmentBytes && map[string]bool{"image/png": true, "image/jpeg": true, "application/pdf": true, "text/plain": true}[contentType]
}

func (s *Service) ListAttachments(issueID string) ([]Attachment, error) {
	var out []Attachment
	return out, s.db.Where("issue_id = ?", issueID).Order("created_at DESC").Find(&out).Error
}
func (s *Service) UploadAttachment(issueID, actorID, requestID string, file *multipart.FileHeader) (Attachment, error) {
	var out Attachment
	if file == nil || file.Size > maxAttachmentBytes || file.Size < 1 {
		return out, ErrInvalidAttachment
	}
	name := filepath.Base(file.Filename)
	if name == "." || name == "" || len(name) > 255 || strings.ContainsAny(name, "\x00\r\n\"") {
		return out, ErrInvalidAttachment
	}
	src, err := file.Open()
	if err != nil {
		return out, err
	}
	defer src.Close()
	buf := make([]byte, 512)
	n, err := io.ReadFull(src, buf)
	if err != nil && err != io.ErrUnexpectedEOF {
		return out, err
	}
	contentType := http.DetectContentType(buf[:n])
	if !validAttachment(contentType, file.Size) {
		return out, ErrInvalidAttachment
	}
	key := attachmentKey(issueID)
	if _, err = s.store.client.PutObject(context.Background(), s.store.bucket, key, io.MultiReader(bytes.NewReader(buf[:n]), src), file.Size, minio.PutObjectOptions{ContentType: contentType}); err != nil {
		return out, err
	}
	out = Attachment{IssueID: issueID, ObjectKey: key, Filename: name, ContentType: contentType, SizeBytes: file.Size, UploadedBy: actorID}
	if err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&out).Error; err != nil {
			return err
		}
		return audit(tx, actorID, "ISSUE_ATTACHMENT_UPLOADED", issueID, nil, out, requestID)
	}); err != nil {
		_ = s.store.client.RemoveObject(context.Background(), s.store.bucket, key, minio.RemoveObjectOptions{})
		return out, err
	}
	return out, nil
}
func (s *Service) DownloadAttachment(issueID, attachmentID string) (Attachment, io.ReadCloser, error) {
	var attachment Attachment
	if err := s.db.Where("id = ? AND issue_id = ?", attachmentID, issueID).First(&attachment).Error; err != nil {
		return attachment, nil, missing(err)
	}
	object, err := s.store.client.GetObject(context.Background(), s.store.bucket, attachment.ObjectKey, minio.GetObjectOptions{})
	if err != nil {
		return attachment, nil, err
	}
	if _, err := object.Stat(); err != nil {
		object.Close()
		return attachment, nil, err
	}
	return attachment, object, nil
}
func (s *Service) DeleteAttachment(issueID, attachmentID, actorID, requestID string) error {
	var attachment Attachment
	if err := s.db.Where("id = ? AND issue_id = ?", attachmentID, issueID).First(&attachment).Error; err != nil {
		return missing(err)
	}
	if err := s.store.client.RemoveObject(context.Background(), s.store.bucket, attachment.ObjectKey, minio.RemoveObjectOptions{}); err != nil {
		return err
	}
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Delete(&attachment).Error; err != nil {
			return err
		}
		return audit(tx, actorID, "ISSUE_ATTACHMENT_DELETED", issueID, attachment, nil, requestID)
	})
}
